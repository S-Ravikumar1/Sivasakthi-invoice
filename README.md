# Siva Sakthi Hosiery Invoice — Full Source Backup

This archive combines the latest available invoice project files with the working Neon-backed party/product masters and duplicate-save protections confirmed in the deployed version.

## Included

- React invoice UI and CSS (`main.jsx`, `styles.css`)
- Invoice database APIs and next invoice number API
- Neon PostgreSQL connection (`db.js`)
- Party and product master APIs (`parties.js`, `products.js`) with duplicate-submission protection
- PDF API wrapper and PDF generator (`api-render-pdf.js`, `render-pdf.js`)
- Vercel routes for invoice, PDF, party, and product APIs (`vercel.json`)
- Database schema for invoices, parties, and products (`schema.sql`)
- `package.json`, `vite.config.js`, `index.html`, and `invoice.js`

## Deploy / restore

1. Keep a copy of this ZIP as your backup.
2. Extract all files into the root of your GitHub repository, preserving the file names and folders.
3. Ensure Vercel has the `DATABASE_URL` environment variable set to your existing Neon PostgreSQL connection string.
4. Deploy on Vercel.
5. Verify `/api/parties` and `/api/products` return JSON on the production domain, then test invoice save/history and PDF generation.

## Database

`schema.sql` contains the table definitions for invoices, parties, and products. Run it in the Neon SQL Editor only if those tables are not already present. It uses `CREATE TABLE IF NOT EXISTS` and does not delete existing records.

## Notes

- This is a source-code backup, not a database backup. It does not include your Neon records or secret environment variables.
- Do not commit your real `DATABASE_URL` or other secrets into GitHub.
- Preserve the existing production project and verify deployment before replacing any working files.

## Product rate precision

Product master rates are rounded to a maximum of 3 decimal places when saved or updated, and the rate input uses a 0.001 step.
