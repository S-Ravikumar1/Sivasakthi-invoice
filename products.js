import pool from "./db.js";

function send(res, status, body) { return res.status(status).json(body); }
function mapProduct(row) { return { id: String(row.id), name: row.product_name, hsn: row.hsn_code || "", rate: String(row.rate ?? 0) }; }

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { rows } = await pool.query("SELECT id, product_name, hsn_code, rate FROM products ORDER BY product_name ASC");
      return send(res, 200, rows.map(mapProduct));
    } catch (error) { console.error("GET products", error); return send(res, 500, { error: "Could not load products" }); }
  }
  if (req.method === "POST") {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const hsn = String(body.hsn || "").trim();
    const rawRate = body.rate === "" || body.rate == null ? 0 : Number(body.rate);
    const rate = Number.isFinite(rawRate) ? Math.round((rawRate + Number.EPSILON) * 1000) / 1000 : rawRate;
    if (!name) return send(res, 400, { error: "Product name is required" });
    if (!Number.isFinite(rate) || rate < 0) return send(res, 400, { error: "Product rate must be a valid non-negative number" });
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const key = JSON.stringify([name.toLocaleLowerCase(), hsn, rate]);
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
      const existing = await client.query(
        "SELECT id, product_name, hsn_code, rate FROM products WHERE lower(trim(product_name)) = lower($1) AND trim(coalesce(hsn_code, '')) = $2 AND rate = $3 ORDER BY id LIMIT 1",
        [name, hsn, rate]
      );
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return send(res, 200, mapProduct(existing.rows[0]));
      }
      const inserted = await client.query(
        "INSERT INTO products (product_name, hsn_code, rate) VALUES ($1, $2, $3) RETURNING id, product_name, hsn_code, rate",
        [name, hsn, rate]
      );
      await client.query("COMMIT");
      return send(res, 201, mapProduct(inserted.rows[0]));
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("POST products", error);
      return send(res, 500, { error: "Could not save product" });
    } finally { client?.release(); }
  }
  if (req.method === "PUT") {
    const body = req.body || {};
    if (!body.id) return send(res, 400, { error: "Product id is required" });
    const name = String(body.name || "").trim();
    const hsn = String(body.hsn || "").trim();
    const rawRate = body.rate === "" || body.rate == null ? 0 : Number(body.rate);
    const rate = Number.isFinite(rawRate) ? Math.round((rawRate + Number.EPSILON) * 1000) / 1000 : rawRate;
    if (!name) return send(res, 400, { error: "Product name is required" });
    if (!Number.isFinite(rate) || rate < 0) return send(res, 400, { error: "Product rate must be a valid non-negative number" });
    try {
      const { rows } = await pool.query(
        "UPDATE products SET product_name=$1, hsn_code=$2, rate=$3, updated_at=NOW() WHERE id=$4 RETURNING id, product_name, hsn_code, rate",
        [name, hsn, rate, body.id]
      );
      if (!rows[0]) return send(res, 404, { error: "Product not found" });
      return send(res, 200, mapProduct(rows[0]));
    } catch (error) { console.error("PUT products", error); return send(res, 500, { error: "Could not update product" }); }
  }
  res.setHeader("Allow", "GET, POST, PUT");
  return send(res, 405, { error: "Method not allowed" });
}
