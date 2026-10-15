# Siva Sakthi Invoice Billing Website — Vercel Vector PDF edition

This project keeps the existing React invoice editor, PostgreSQL/Neon invoice storage, invoice versioning, and A4 layout. PDF download is generated directly by the Vercel `/api/render-pdf` function using jsPDF vector drawing. It does not require Render, `RENDER_PDF_URL`, or `PDF_API_TOKEN`.

## Deploy

1. Upload the contents of this folder to the root of your GitHub repository.
2. In Vercel, set `DATABASE_URL` to your Neon PostgreSQL connection string (Production, and Preview if needed).
3. Build command: `npm run build`; output directory: `dist`.
4. Redeploy.

The `api/` folder must remain at the repository root so Vercel can detect the serverless functions. The database schema must already be created in Neon.

## PDF notes

The PDF endpoint draws text and borders as vector PDF paths instead of embedding a screenshot of the invoice. Shared borders are drawn once using one line width to avoid thickened overlapping edges. The generated PDF should be tested after deployment against the desired invoice content and layout.
