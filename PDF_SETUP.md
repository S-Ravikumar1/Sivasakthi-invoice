# PDF service setup

## Vercel environment variables

Set these in **Production**:

- `RENDER_PDF_URL` = `https://sivasakthi-pdf.onrender.com/render`
- `PDF_API_TOKEN` = the same random token used by the Render service
- `DATABASE_URL` = your PostgreSQL connection string

The updated Vercel API also accepts the Render base URL and automatically adds `/render`.

## Render environment variable

Set:

- `PDF_API_TOKEN` = exactly the same value as Vercel

Render service:

- Build Command: `npm install`
- Start Command: `npm run render-pdf`

The PDF server listens on Render's `PORT` and accepts `POST /render` (and `/` as a fallback).

## Changes in this version

- Added Vercel PDF request/response logging.
- Shows the real Render error instead of only a generic PDF failure message.
- Automatically adds `/render` when `RENDER_PDF_URL` contains only the Render base URL.
- Added a 120-second timeout for Render cold starts.
- Added Render request, authentication, render-error and success logs.
- Render accepts both `/render` and `/`.
- PDF declaration is on the **left** and company/authorized signatory is on the **right**.
