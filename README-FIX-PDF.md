PDF LINE-WEIGHT FIX

The previous downloadPdf() function in main.jsx used html2canvas + jsPDF and embedded the entire invoice as a raster PNG image. That path bypassed render-pdf-server.js, so changes to the server renderer could not affect the downloaded PDF.

This version changes the Download PDF action to POST the invoice and totals to /api/render-pdf. The API proxy forwards it to the Render service, where Puppeteer generates a vector/text PDF using render-pdf-server.js. The downloaded PDF should no longer be a single raster image.

Deployment requirements:
1. Deploy this frontend/API code to Vercel.
2. Deploy render-pdf-server.js as the Render web service (npm run render-pdf).
3. Set RENDER_PDF_URL in Vercel to the Render service URL ending in /render.
4. If using PDF_API_TOKEN, set the same token in Vercel and Render.
5. Generate a fresh PDF using the Download PDF button after both services deploy.
