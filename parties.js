import pool from "./db.js";

function send(res, status, body) { return res.status(status).json(body); }
function mapParty(row) { return { id: String(row.id), name: row.party_name, address: row.party_address || "", gstin: row.gstin || "" }; }

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const { rows } = await pool.query("SELECT id, party_name, party_address, gstin FROM parties ORDER BY party_name ASC");
      return send(res, 200, rows.map(mapParty));
    } catch (error) { console.error("GET parties", error); return send(res, 500, { error: "Could not load parties" }); }
  }
  if (req.method === "POST") {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const address = String(body.address || "").trim();
    const gstin = String(body.gstin || "").trim().toUpperCase();
    if (!name) return send(res, 400, { error: "Party name is required" });
    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      // Serialize identical submissions across serverless instances.
      const key = JSON.stringify([name.toLocaleLowerCase(), address, gstin]);
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
      const existing = await client.query(
        "SELECT id, party_name, party_address, gstin FROM parties WHERE lower(trim(party_name)) = lower($1) AND trim(coalesce(party_address, '')) = $2 AND upper(trim(coalesce(gstin, ''))) = $3 ORDER BY id LIMIT 1",
        [name, address, gstin]
      );
      if (existing.rows[0]) {
        await client.query("COMMIT");
        return send(res, 200, mapParty(existing.rows[0]));
      }
      const inserted = await client.query(
        "INSERT INTO parties (party_name, party_address, gstin) VALUES ($1, $2, $3) RETURNING id, party_name, party_address, gstin",
        [name, address, gstin]
      );
      await client.query("COMMIT");
      return send(res, 201, mapParty(inserted.rows[0]));
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      console.error("POST parties", error);
      return send(res, 500, { error: "Could not save party" });
    } finally { client?.release(); }
  }
  if (req.method === "PUT") {
    const body = req.body || {};
    if (!body.id) return send(res, 400, { error: "Party id is required" });
    const name = String(body.name || "").trim();
    if (!name) return send(res, 400, { error: "Party name is required" });
    try {
      const { rows } = await pool.query(
        "UPDATE parties SET party_name=$1, party_address=$2, gstin=$3, updated_at=NOW() WHERE id=$4 RETURNING id, party_name, party_address, gstin",
        [name, String(body.address || "").trim(), String(body.gstin || "").trim().toUpperCase(), body.id]
      );
      if (!rows[0]) return send(res, 404, { error: "Party not found" });
      return send(res, 200, mapParty(rows[0]));
    } catch (error) { console.error("PUT parties", error); return send(res, 500, { error: "Could not update party" }); }
  }
  res.setHeader("Allow", "GET, POST, PUT");
  return send(res, 405, { error: "Method not allowed" });
}
