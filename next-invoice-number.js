import pool from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { rows } = await pool.query(`
      SELECT COALESCE(MAX((m[1])::bigint), 0) AS max_no
      FROM (
        SELECT regexp_match(base_invoice_no, '^([0-9]+)') AS m
        FROM invoices
      ) x
      WHERE m IS NOT NULL
    `);
    const maxNo = BigInt(rows[0]?.max_no || 0);
    return res.status(200).json({ invoiceNo: String(maxNo + 1n) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Could not get next invoice number" });
  }
}
