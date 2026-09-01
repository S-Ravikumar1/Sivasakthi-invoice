import pool from "../../db.js";
import { cleanBase, makeInvoiceNo } from "../../invoice.js";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const method = event.httpMethod;
  const params = event.queryStringParameters || {};
  try {
    if (method === "GET") {
      const { id, invoiceNo } = params;
      if (id) {
        const { rows } = await pool.query(`SELECT id, invoice_no, invoice_date, data, created_at, updated_at FROM invoices WHERE id = $1`, [id]);
        if (!rows[0]) return json(404, { error: "Invoice not found" });
        return json(200, rows[0]);
      }
      if (invoiceNo) {
        const base = cleanBase(invoiceNo);
        const { rows } = await pool.query(`SELECT id, invoice_no, invoice_date, data, created_at, updated_at FROM invoices WHERE base_invoice_no = $1 ORDER BY suffix ASC`, [base]);
        return json(200, rows);
      }
      const { rows } = await pool.query(`SELECT id, invoice_no, invoice_date, data, created_at, updated_at FROM invoices ORDER BY created_at DESC LIMIT 100`);
      return json(200, rows);
    }

    const body = event.body ? JSON.parse(event.body) : {};

    if (method === "POST") {
      const base = cleanBase(body.invoiceNo);
      if (!base) return json(400, { error: "Invoice number is required" });
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows: existing } = await client.query(`SELECT id, suffix FROM invoices WHERE base_invoice_no = $1 ORDER BY suffix DESC FOR UPDATE`, [base]);
        for (const row of existing) {
          const nextSuffix = Number(row.suffix) + 1;
          await client.query(`UPDATE invoices SET suffix = $1, invoice_no = $2, updated_at = NOW() WHERE id = $3`, [nextSuffix, makeInvoiceNo(base, nextSuffix), row.id]);
        }
        const { rows } = await client.query(`INSERT INTO invoices (base_invoice_no, suffix, invoice_no, invoice_date, data) VALUES ($1, 0, $2, $3, $4::jsonb) RETURNING id, invoice_no, invoice_date, data, created_at, updated_at`, [base, base, body.date || new Date().toISOString().slice(0, 10), JSON.stringify(body.data || {})]);
        await client.query("COMMIT");
        return json(201, rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        console.error("[INVOICE_SAVE_ERROR]", error);
        return json(500, { error: "Could not save invoice" });
      } finally { client.release(); }
    }

    if (method === "PUT") {
      if (!body.id) return json(400, { error: "Invoice id is required" });
      const { rows } = await pool.query(`UPDATE invoices SET invoice_date = $1, data = $2::jsonb, updated_at = NOW() WHERE id = $3 RETURNING id, invoice_no, invoice_date, data, created_at, updated_at`, [body.date || new Date().toISOString().slice(0, 10), JSON.stringify(body.data || {}), body.id]);
      if (!rows[0]) return json(404, { error: "Invoice not found" });
      return json(200, rows[0]);
    }

    return { statusCode: 405, headers: { Allow: "GET, POST, PUT" }, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (error) {
    console.error("[INVOICE_API_ERROR]", error);
    return json(500, { error: "Database error" });
  }
};
