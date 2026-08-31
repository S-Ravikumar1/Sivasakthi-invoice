# Siva Sakthi Invoice Billing Website — PostgreSQL Edition

A Vite + React billing website with PostgreSQL storage, editable invoice history, automatic invoice numbering, duplicate-number versioning, and an A4 tax-invoice PDF layout.

## Database features

- PostgreSQL stores every saved invoice.
- Refreshing the page starts a new invoice using the next numeric invoice number.
- Saved invoices can be searched and opened again for editing.
- Saving a new invoice with an existing number automatically versions the previous invoices:
  - `10` → `10a`
  - next new `10` → old `10a` becomes `10b`, old `10` becomes `10a`
  - next new `10` → `10a` → `10b`, `10b` → `10c`
- Existing saved invoices are updated in place when edited.
- Invoice number and date are displayed at 16px bold.
- Party name and address remain 16px.
- PDF/print invoice is A4.

## PostgreSQL setup

Create a PostgreSQL database using Neon, Supabase, Railway, or another PostgreSQL provider.

Run `db/schema.sql` once in the database SQL editor.

Then add this Vercel environment variable:

```text
DATABASE_URL=your-postgresql-connection-string
```

Use the same variable for Production and Preview if you want both environments to use the same database.

## GitHub / Vercel structure

The repository root should contain:

- `index.html`
- `main.jsx`
- `styles.css`
- `package.json`
- `vite.config.js`
- `api/invoices.js`
- `api/next-invoice-number.js`
- `api/_db.js`
- `api/_invoice.js`
- `db/schema.sql`

Vercel detects the Vite frontend and the `/api` serverless functions automatically.

Build command:

```text
npm run build
```

Output directory:

```text
dist
```

## Local development

```bash
npm install
npm run dev
```

For local API/database testing, set `DATABASE_URL` in the environment before starting the Vite/Vercel development environment.

## Important

This application stores invoice data in PostgreSQL but does not submit GST invoices to the government portal or generate IRNs/e-invoices. Any required GST/e-invoicing compliance integration should be added separately according to the business's requirements.


## Server-side PDF with Render
The browser now sends PDF data to `/api/render-pdf`. Vercel proxies this request to a Render Web Service. Set `RENDER_PDF_URL` in Vercel to the Render service URL plus `/render`. Deploy the same repository as a Render Web Service with Build Command `npm install` and Start Command `npm run render-pdf`. The `render-pdf` start script explicitly installs the Puppeteer Chrome browser before starting the service, so it works even when npm has skipped Puppeteer install scripts. Render web services provide an `onrender.com` URL and must listen on `0.0.0.0`; this project uses the `PORT` environment variable.


### PDF service security
Set the same random `PDF_API_TOKEN` environment variable in both Vercel and Render. The Vercel proxy sends it to Render so the public PDF service cannot be used without the token.
