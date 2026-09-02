import pool from "./db.js";
import { cleanBase, makeInvoiceNo } from "./invoice.js";

function send(res, status, body) {
  res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const { id, invoiceNo } = req.query || {};
    try {
      if (id) {
        const { rows } = await pool.query(
          `SELECT id, invoice_no, invoice_date, data, created_at, updated_at
           FROM invoices WHERE id = $1`, [id]
        );
        if (!rows[0]) return send(res, 404, { error: "Invoice not found" });
        return send(res, 200, rows[0]);
      }
      if (invoiceNo) {
        const base = cleanBase(invoiceNo);
        const { rows } = await pool.query(
          `SELECT id, invoice_no, invoice_date, data, created_at, updated_at
           FROM invoices WHERE base_invoice_no = $1
           ORDER BY suffix ASC`, [base]
        );
        return send(res, 200, rows);
      }
      const { rows } = await pool.query(
        `SELECT id, invoice_no, invoice_date, data, created_at, updated_at
         FROM invoices ORDER BY created_at DESC LIMIT 100`
      );
      return send(res, 200, rows);
    } catch (error) {
      console.error("GET /api/invoices error:", error);
      return send(res, 500, { error: error?.message || "Database error" });
    }
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const base = cleanBase(body.invoiceNo);
    if (!base) return send(res, 400, { error: "Invoice number is required" });

    let client;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      const { rows: existing } = await client.query(
        `SELECT id, suffix FROM invoices WHERE base_invoice_no = $1
         ORDER BY suffix DESC FOR UPDATE`, [base]
      );

      // 10 -> 10a; 10a -> 10b; 10b -> 10c, etc.
      for (const row of existing) {
        const nextSuffix = Number(row.suffix) + 1;
        await client.query(
          `UPDATE invoices SET suffix = $1, invoice_no = $2, updated_at = NOW() WHERE id = $3`,
          [nextSuffix, makeInvoiceNo(base, nextSuffix), row.id]
        );
      }

      const { rows } = await client.query(
        `INSERT INTO invoices (base_invoice_no, suffix, invoice_no, invoice_date, data)
         VALUES ($1, 0, $2, $3, $4::jsonb)
         RETURNING id, invoice_no, invoice_date, data, created_at, updated_at`,
        [base, base, body.date || new Date().toISOString().slice(0, 10), JSON.stringify(body.data || {})]
      );
      await client.query("COMMIT");
      return send(res, 201, rows[0]);
    } catch (error) {
      if (client) {
        try { await client.query("ROLLBACK"); } catch (rollbackError) { console.error("Rollback error:", rollbackError); }
      }
      console.error("POST /api/invoices error:", error);
      return send(res, 500, { error: error?.message || "Could not save invoice" });
    } finally {
      if (client) client.release();
    }
  }

  if (req.method === "PUT") {
    const body = req.body || {};
    if (!body.id) return send(res, 400, { error: "Invoice id is required" });
    try {
      const { rows } = await pool.query(
        `UPDATE invoices
         SET invoice_date = $1, data = $2::jsonb, updated_at = NOW()
         WHERE id = $3
         RETURNING id, invoice_no, invoice_date, data, created_at, updated_at`,
        [body.date || new Date().toISOString().slice(0, 10), JSON.stringify(body.data || {}), body.id]
      );
      if (!rows[0]) return send(res, 404, { error: "Invoice not found" });
      return send(res, 200, rows[0]);
    } catch (error) {
      console.error("PUT /api/invoices error:", error);
      return send(res, 500, { error: error?.message || "Could not update invoice" });
    }
  }

  res.setHeader("Allow", "GET, POST, PUT");
  return send(res, 405, { error: "Method not allowed" });
}
