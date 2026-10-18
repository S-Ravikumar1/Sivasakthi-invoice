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
    if (!name) return send(res, 400, { error: "Party name is required" });
    try {
      const { rows } = await pool.query(
        "INSERT INTO parties (party_name, party_address, gstin) VALUES ($1, $2, $3) RETURNING id, party_name, party_address, gstin",
        [name, String(body.address || "").trim(), String(body.gstin || "").trim().toUpperCase()]
      );
      return send(res, 201, mapParty(rows[0]));
    } catch (error) { console.error("POST parties", error); return send(res, 500, { error: "Could not save party" }); }
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
