import pool from "../../db.js";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") return { statusCode: 405, headers: { Allow: "GET" }, body: JSON.stringify({ error: "Method not allowed" }) };
  try {
    const { rows } = await pool.query(`SELECT COALESCE(MAX((m[1])::bigint), 0) AS max_no FROM (SELECT regexp_match(base_invoice_no, '^([0-9]+)') AS m FROM invoices) x WHERE m IS NOT NULL`);
    const maxNo = BigInt(rows[0]?.max_no || 0);
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ invoiceNo: String(maxNo + 1n) }) };
  } catch (error) {
    console.error("[NEXT_INVOICE_ERROR]", error);
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Could not get next invoice number" }) };
  }
};

