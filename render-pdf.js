export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const target = process.env.RENDER_PDF_URL;
  const token = process.env.PDF_API_TOKEN;
  if (!target) return res.status(500).json({ error: "RENDER_PDF_URL is not configured" });
  try {
    const upstream = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { "x-pdf-token": token } : {}) }, body: JSON.stringify(req.body || {}) });
    const type = upstream.headers.get("content-type") || "application/pdf";
    const body = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status).setHeader("Content-Type", type).setHeader("Content-Disposition", `attachment; filename="${(req.body?.invoice?.invoiceNo || "tax-invoice")}.pdf"`);
    return res.send(body);
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "PDF rendering service unavailable" });
  }
}
