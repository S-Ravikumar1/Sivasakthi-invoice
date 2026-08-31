export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const configuredUrl = process.env.RENDER_PDF_URL?.trim();
  const token = process.env.PDF_API_TOKEN;

  if (!configuredUrl) {
    console.error("PDF CONFIG ERROR: RENDER_PDF_URL is not configured");
    return res.status(500).json({ error: "RENDER_PDF_URL is not configured" });
  }

  // Accept either the Render service URL or the full /render URL.
  let target = configuredUrl.replace(/\/+$/, "");
  try {
    const parsed = new URL(target);
    if (!parsed.pathname || parsed.pathname === "/") {
      parsed.pathname = "/render";
      target = parsed.toString().replace(/\/+$/, "");
    }
  } catch (error) {
    console.error("PDF CONFIG ERROR: Invalid RENDER_PDF_URL", error);
    return res.status(500).json({ error: "Invalid RENDER_PDF_URL" });
  }

  console.log("PDF REQUEST: target=", target);
  console.log("PDF REQUEST: invoice=", req.body?.invoice?.invoiceNo || "unknown");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-pdf-token": token } : {})
      },
      body: JSON.stringify(req.body || {}),
      signal: controller.signal
    });

    console.log("PDF RESPONSE: status=", upstream.status);

    const type = upstream.headers.get("content-type") || "application/pdf";
    const body = Buffer.from(await upstream.arrayBuffer());
    const invoiceNo = String(req.body?.invoice?.invoiceNo || "tax-invoice")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    res
      .status(upstream.status)
      .setHeader("Content-Type", type)
      .setHeader("Content-Disposition", `attachment; filename="${invoiceNo}.pdf"`);

    return res.send(body);
  } catch (e) {
    const detail = e?.name === "AbortError"
      ? "Render PDF service timed out after 120 seconds"
      : String(e?.message || e);

    console.error("PDF REQUEST ERROR:", detail);
    return res.status(502).json({
      error: "PDF rendering service unavailable",
      detail
    });
  } finally {
    clearTimeout(timeout);
  }
}
