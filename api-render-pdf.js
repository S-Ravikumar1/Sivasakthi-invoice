export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const configured = String(process.env.RENDER_PDF_URL || "").trim().replace(/\/$/, "");
  const token = process.env.PDF_API_TOKEN;
  if (!configured) return res.status(500).json({ error: "RENDER_PDF_URL is not configured" });

  // Accept either the Render service root or the full /render endpoint.
  const target = configured.endsWith("/render") ? configured : `${configured}/render`;

  try {
    console.log("PDF request -> Render:", target);

    const upstream = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-pdf-token": token } : {})
      },
      body: JSON.stringify(req.body || {})
    });

    const contentType = upstream.headers.get("content-type") || "";
    const raw = await upstream.arrayBuffer();
    const body = Buffer.from(raw);

    console.log("Render PDF response:", upstream.status, contentType);

    if (!upstream.ok) {
      let detail = `Render service returned HTTP ${upstream.status}`;
      if (contentType.includes("application/json")) {
        try {
          const parsed = JSON.parse(body.toString("utf8"));
          if (parsed?.error) detail = String(parsed.error);
        } catch {}
      } else if (body.length && body.length < 20000) {
        const text = body.toString("utf8").trim();
        if (text) detail = text;
      }
      console.error("Render PDF error:", detail);
      return res.status(502).json({ error: detail });
    }

    res.status(200)
      .setHeader("Content-Type", contentType || "application/pdf")
      .setHeader(
        "Content-Disposition",
        `attachment; filename="${String(req.body?.invoice?.invoiceNo || "tax-invoice").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf"`
      );
    return res.send(body);
  } catch (e) {
    console.error("Render PDF connection error:", e);
    return res.status(502).json({
      error: `Could not connect to Render PDF service: ${e?.message || "unknown error"}`
    });
  }
}
