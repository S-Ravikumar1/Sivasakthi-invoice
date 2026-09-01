export default async (req) => {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const token = process.env.BROWSERLESS_TOKEN;

  if (!token) {
    return new Response(
      JSON.stringify({
        error: "BROWSERLESS_TOKEN is not configured"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const data = await req.json();

    const {
      invoice = {},
      products = [],
      subtotal = 0,
      cgst = 0,
      sgst = 0,
      igst = 0,
      roundOff = 0,
      grandTotal = 0,
      taxRate = 5
    } = data;

    const esc = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const money = (value) =>
      Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

    const numberRate = (value) =>
      Number(value || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
      });

    function words(number) {
      number = Math.round(Number(number || 0));

      if (!number) return "Zero";

      const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen"
      ];

      const tens = [
        "",
        "",
        "Twenty",
        "Thirty",
        "Forty",
        "Fifty",
        "Sixty",
        "Seventy",
        "Eighty",
        "Ninety"
      ];

      const under1000 = (n) => {
        let result = "";

        if (n >= 100) {
          result += ones[Math.floor(n / 100)] + " Hundred";
          n %= 100;

          if (n) result += " ";
        }

        if (n >= 20) {
          result += tens[Math.floor(n / 10)];
          n %= 10;

          if (n) result += " " + ones[n];
        } else if (n) {
          result += ones[n];
        }

        return result;
      };

      let result = "";

      if (number >= 10000000) {
        result += under1000(Math.floor(number / 10000000)) + " Crore";
        number %= 10000000;

        if (number) result += " ";
      }

      if (number >= 100000) {
        result += under1000(Math.floor(number / 100000)) + " Lakh";
        number %= 100000;

        if (number) result += " ";
      }

      if (number >= 1000) {
        result += under1000(Math.floor(number / 1000)) + " Thousand";
        number %= 1000;

        if (number) result += " ";
      }

      if (number) {
        result += under1000(number);
      }

      return result;
    }

    const amountWords =
      words(grandTotal) + " Only";

    const calculatedProducts = products.map((product) => {
      const qty = (product.items || []).reduce(
        (total, item) =>
          total + Number(item.pcs || 0),
        0
      );

      const amount =
        qty * Number(product.rate || 0);

      return {
        ...product,
        qty,
        amount
      };
    });

    const productRows = calculatedProducts
      .map(
        (product, index) => `
          <tr class="product-row">
            <td class="sr">${index + 1}</td>

            <td class="description">
              <div class="product-name">
                ${esc(product.name || "Product")}
              </div>

              <div class="item-heading">
                <span>DC NO</span>
                <span>PCS</span>
              </div>

              ${(product.items || [])
                .map(
                  (item) => `
                    <div class="item-row">
                      <span>${esc(item.dcNo || "")}</span>
                      <span>${esc(item.pcs || "")}</span>
                    </div>
                  `
                )
                .join("")}
            </td>

            <td class="hsn">
              ${esc(product.hsn || "")}
            </td>

            <td class="pcs">
              ${product.qty}
            </td>

            <td class="rate">
              ${money(product.rate)}
            </td>

            <td class="amount">
              ${money(product.amount)}
            </td>
          </tr>
        `
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">

<style>

@page {
  size: A4;
  margin: 0;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  width: 210mm;
  height: 297mm;
  font-family: Arial, Helvetica, sans-serif;
  color: #111;
}

.invoice-page {
  width: 210mm;
  height: 297mm;
  padding: 8mm;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}

.header {
  border: 1.5px solid #444;
}

.header-title {
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  padding: 4px;
  border-bottom: 1.5px solid #444;
}

.company-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.company-left,
.company-right {
  padding: 6px;
  min-height: 75px;
}

.company-left {
  border-right: 1.5px solid #444;
}

.company-name {
  font-size: 17px;
  font-weight: bold;
}

.company-info {
  font-size: 11px;
  line-height: 1.4;
}

.invoice-info {
  font-size: 11px;
  line-height: 1.6;
}

.party-section {
  margin-top: 5px;
  border: 1.5px solid #444;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.party {
  padding: 6px;
  min-height: 55px;
}

.party:first-child {
  border-right: 1.5px solid #444;
}

.party-title {
  font-weight: bold;
  font-size: 11px;
  margin-bottom: 3px;
}

.party-content {
  font-size: 11px;
  line-height: 1.4;
}

.items-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 5px;
  table-layout: fixed;
  border: 1.5px solid #444;
}

.items-table th,
.items-table td {
  border: 1.5px solid #777;
}

.items-table th {
  height: 28px;
  font-size: 10px;
  text-align: center;
  vertical-align: middle;
  font-weight: bold;
}

.items-table td {
  font-size: 10px;
  vertical-align: top;
}

.sr {
  width: 8%;
  text-align: center;
}

.description {
  width: 42%;
  padding: 5px;
}

.hsn {
  width: 13%;
  text-align: center;
  padding: 5px;
}

.pcs {
  width: 10%;
  text-align: center;
  padding: 5px;
}

.rate {
  width: 13%;
  text-align: right;
  padding: 5px;
}

.amount {
  width: 14%;
  text-align: right;
  padding: 5px;
}

.product-name {
  font-weight: bold;
  text-align: center;
  margin-bottom: 4px;
}

.item-heading {
  display: grid;
  grid-template-columns: 1fr 1fr;
  text-align: center;
  font-weight: bold;
  margin-bottom: 2px;
}

.item-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  text-align: center;
  line-height: 1.3;
}

.total-pcs-row {
  height: 22px;
  font-weight: bold;
}

.product-space {
  height: 100%;
  min-height: 0;
}

.amount-total-section {
  height: 100px;
  min-height: 100px;
  display: grid;
  grid-template-columns: 1fr 5fr;
  border-left: 1.5px solid #444;
  border-right: 1.5px solid #444;
  border-bottom: 1.5px solid #444;
}

.amount-words {
  padding: 7px;
  border-right: 1.5px solid #444;
  font-size: 12px;
  line-height: 1.35;
}

.amount-words-title {
  font-weight: bold;
  margin-bottom: 4px;
}

.tax-summary {
  display: grid;
  grid-template-rows: repeat(5, 1fr);
}

.tax-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1.5px solid #777;
  font-size: 10px;
}

.tax-row:last-child {
  border-bottom: 0;
}

.tax-label {
  padding: 5px 7px;
}

.tax-value {
  padding: 5px 7px;
  text-align: right;
}

.grand-total {
  font-weight: bold;
  font-size: 11px;
}

.bottom-sections {
  height: 100px;
  min-height: 100px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-left: 1.5px solid #444;
  border-right: 1.5px solid #444;
  border-bottom: 1.5px solid #444;
}

.declaration {
  padding: 7px;
  border-right: 1.5px solid #444;
  font-size: 12px;
  line-height: 1.35;
}

.declaration-title {
  font-weight: bold;
  margin-bottom: 6px;
}

.signature {
  position: relative;
  padding: 7px;
  text-align: right;
  font-size: 11px;
}

.company-signature {
  font-weight: bold;
}

.authorized {
  position: absolute;
  right: 7px;
  bottom: 7px;
  font-weight: bold;
}

.footer {
  margin-top: auto;
  text-align: center;
  font-size: 9px;
  padding-top: 3px;
}

</style>
</head>

<body>

<div class="invoice-page">

  <div class="header">

    <div class="header-title">
      TAX INVOICE
    </div>

    <div class="company-section">

      <div class="company-left">
        <div class="company-name">
          ${esc(invoice.companyName || "SIVA SAKTHI HOSIERY")}
        </div>

        <div class="company-info">
          ${esc(invoice.companyAddress || "")}
          <br>
          GSTIN: ${esc(invoice.gstin || "")}
          <br>
          ${esc(invoice.phone || "")}
          ${invoice.email ? `<br>${esc(invoice.email)}` : ""}
        </div>
      </div>

      <div class="company-right">

        <div class="invoice-info">
          <b>Invoice No:</b>
          ${esc(invoice.invoiceNo || "")}
          <br>

          <b>Date:</b>
          ${esc(invoice.date || "")}
          <br>

          <b>GST Rate:</b>
          ${numberRate(taxRate)}%
        </div>

      </div>

    </div>

  </div>

  <div class="party-section">

    <div class="party">
      <div class="party-title">
        BILL TO
      </div>

      <div class="party-content">
        <b>${esc(invoice.partyName || "")}</b>
        <br>
        ${esc(invoice.partyAddress || "")}
        ${
          invoice.partyGstin
            ? `<br>GSTIN: ${esc(invoice.partyGstin)}`
            : ""
        }
      </div>
    </div>

    <div class="party">
      <div class="party-title">
        SUPPLY DETAILS
      </div>

      <div class="party-content">
        Tax Mode:
        ${esc(invoice.taxMode || "CGST + SGST")}
      </div>
    </div>

  </div>

  <table class="items-table">

    <thead>
      <tr>
        <th class="sr">S.No</th>
        <th class="description">Description</th>
        <th class="hsn">HSN/SAC</th>
        <th class="pcs">PCS</th>
        <th class="rate">Rate</th>
        <th class="amount">Amount</th>
      </tr>
    </thead>

    <tbody>

      ${productRows}

      <tr class="total-pcs-row">
        <td colspan="3" style="text-align:right;padding:5px;">
          Total PCS
        </td>

        <td style="text-align:center;">
          ${calculatedProducts.reduce(
            (sum, product) => sum + product.qty,
            0
          )}
        </td>

        <td></td>
        <td></td>
      </tr>

    </tbody>

  </table>

  <div class="product-space"></div>

  <div class="amount-total-section">

    <div class="amount-words">

      <div class="amount-words-title">
        Total Amount (Rs in Words)
      </div>

      ${esc(amountWords)}

    </div>

    <div class="tax-summary">

      <div class="tax-row">
        <div class="tax-label">Total</div>
        <div class="tax-value">${money(subtotal)}</div>
      </div>

      <div class="tax-row">
        <div class="tax-label">
          Add : CGST @ ${numberRate(taxRate / 2)}%
        </div>
        <div class="tax-value">${money(cgst)}</div>
      </div>

      <div class="tax-row">
        <div class="tax-label">
          Add : SGST @ ${numberRate(taxRate / 2)}%
        </div>
        <div class="tax-value">${money(sgst)}</div>
      </div>

      <div class="tax-row">
        <div class="tax-label">Round Off</div>
        <div class="tax-value">${money(roundOff)}</div>
      </div>

      <div class="tax-row grand-total">
        <div class="tax-label">Grand Total</div>
        <div class="tax-value">${money(grandTotal)}</div>
      </div>

    </div>

  </div>

  <div class="bottom-sections">

    <div class="declaration">

      <div class="declaration-title">
        Declaration
      </div>

      I declare that this invoice shows the actual price
      of the jobwork and all the particulars are true and
      correct to the best of my knowledge.

    </div>

    <div class="signature">

      <div class="company-signature">
        For ${esc(invoice.companyName || "SIVA SAKTHI HOSIERY")}
      </div>

      <div class="authorized">
        Authorized Signatory
      </div>

    </div>

  </div>

  <div class="footer">
    This is a computer generated invoice.
  </div>

</div>

</body>
</html>
`;

    const browserlessUrl =
      `https://production-sfo.browserless.io/pdf?token=${encodeURIComponent(token)}`;

    const upstream = await fetch(browserlessUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      },
      body: JSON.stringify({
        html,
        options: {
          format: "A4",
          printBackground: true,
          margin: {
            top: "0mm",
            right: "0mm",
            bottom: "0mm",
            left: "0mm"
          },
          preferCSSPageSize: true
        }
      })
    });

    if (!upstream.ok) {
      const errorText = await upstream.text();

      console.error(
        "Browserless error:",
        upstream.status,
        errorText
      );

      return new Response(
        JSON.stringify({
          error: "Browserless PDF generation failed",
          details: errorText
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );
    }

    const pdf = await upstream.arrayBuffer();

    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          `attachment; filename="${invoice.invoiceNo || "tax-invoice"}.pdf"`,
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {

    console.error("PDF generation error:", error);

    return new Response(
      JSON.stringify({
        error: "PDF generation failed",
        details: error.message
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};
