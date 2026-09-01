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


## PDF generation with Netlify

PDF generation is now handled by a Netlify Function using `@sparticuz/chromium` and `puppeteer-core`. This removes the dependency on the Render PDF web service. Netlify's official Functions model supports web-request handlers, and the Chromium setup follows the serverless Chromium approach used for Netlify/AWS-style runtimes.

Deploy this repository as a separate Netlify site for the PDF service, or deploy the whole repository to Netlify if you also want the frontend there. The function endpoint is:

```text
/.netlify/functions/render-pdf
```

The repository includes a redirect so `/api/render-pdf` also reaches the Netlify Function.

### Vercel frontend + Netlify PDF service

If the invoice website remains on Vercel, set this Vercel environment variable to the Netlify site URL:

```text
VITE_PDF_API_URL=https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/render-pdf
```

Then redeploy the Vercel frontend. The browser will send the invoice data directly to Netlify for PDF generation.

Optional Netlify environment variables:

```text
PDF_ALLOWED_ORIGIN=https://YOUR-VERCEL-SITE.vercel.app
PDF_API_TOKEN=optional-token
```

If `PDF_ALLOWED_ORIGIN` is not set, the function allows all origins. `PDF_API_TOKEN` is only useful when the caller can keep the token secret; do not put a secret token in `VITE_*` frontend variables.

### Netlify deployment

Build command:

```text
npm run build
```

Publish directory:

```text
dist
```

Functions directory:

```text
netlify/functions
```

Use Node.js 22 or newer for the current serverless Chromium dependency.
