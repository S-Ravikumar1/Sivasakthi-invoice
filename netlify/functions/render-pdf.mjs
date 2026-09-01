import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const rate = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    useGrouping: true,
    maximumFractionDigits: 20,
  });

function words(number) {
  let n = Math.round(Number(number || 0));

  if (!n) return "Zero";

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
    "Nineteen",
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
    "Ninety",
  ];

  const underThousand = (x) => {
    let result = "";

    if (x >= 100) {
      result += ones[Math.floor(x / 100)] + " Hundred";
      x %= 100;

      if (x) result += " ";
    }

    if (x >= 20) {
      result += tens[Math.floor(x / 10)];
      x %= 10;

      if (x) result += " " + ones[x];
    } else if (x) {
      result += ones[x];
    }

    return result;
  };

  let result = "";

  if (n >= 10000000) {
    result += underThousand(Math.floor(n / 10000000)) + " Crore";
    n %= 10000000;

    if (n) result += " ";
  }

  if (n >= 100000) {
    result += underThousand(Math.floor(n / 100000)) + " Lakh";
    n %= 100000;

    if (n) result += " ";
  }

  if (n >= 1000) {
    result += underThousand(Math.floor(n / 1000)) + " Thousand";
    n %= 1000;

    if (n) result += " ";
  }

  if (n) {
    result += underThousand(n);
  }

  return result;
}

function buildInvoiceHtml({
  invoice,
  products,
  subtotal,
  cgst,
  sgst,
  igst,
  roundOff,
  grandTotal,
  taxRate,
}) {
  const items = products.map((product) => {
    const qty = (product.items || []).reduce(
      (total, item) => total + Number(item.pcs || 0),
      0
    );

    return {
      ...product,
      qty,
      amount: qty * Number(product.rate || 0),
    };
  });

  const taxMode = invoice.taxMode || "cgstsgst";

  const rows = items
    .map(
      (product) => `
        <tr>
          <td class="desc">
            <div class="pn">${esc(product.name || "Product")}</div>

            <div class="ih">
              <span>DC NO</span>
              <span>PCS</span>
            </div>

            ${(product.items || [])
              .map(
                (item) => `
                  <div class="ir">
                    <span>${esc(item.dcNo || "—")}</span>
                    <span>${esc(item.pcs || 0)}</span>
                  </div>
                `
              )
              .join("")}

            <div class="pt">
              Total PCS: ${product.qty}
            </div>
          </td>

          <td>${esc(product.hsn || "")}</td>

          <td class="r">
            ${product.qty || ""}
          </td>

          <td class="r">
            ${rate(product.rate)}
          </td>

          <td class="r">
            ${money(product.amount)}
          </td>
        </tr>
      `
    )
    .join("");

  const taxRows =
    taxMode === "cgstsgst"
      ? `
          <div class="tr">
            <span>Add : CGST @ ${(Number(taxRate) / 2).toFixed(2)}%</span>
            <span>${money(cgst)}</span>
          </div>

          <div class="tr">
            <span>Add : SGST @ ${(Number(taxRate) / 2).toFixed(2)}%</span>
            <span>${money(sgst)}</span>
          </div>
        `
      : `
          <div class="tr">
            <span>Add : IGST @ ${Number(taxRate).toFixed(2)}%</span>
            <span>${money(igst)}</span>
          </div>
        `;

  return `
<!doctype html>

<html>
<head>

<meta charset="utf-8">

<style>

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background: #fff;
  font-family: Arial, Helvetica, sans-serif;
  color: #222;
}

.paper {
  width: 210mm;
  height: 297mm;
  background: #fff;
  padding: 8mm;
}

.frame {
  border: 2px solid #444;
  height: 281mm;
  overflow: hidden;
  position: relative;
}

/* HEADER */

.top {
  height: 60px;
  border-bottom: 1px solid #444;
  display: grid;
  grid-template-columns: 1fr 235px;
}

.title {
  text-align: center;
  font-size: 18px;
  font-weight: 800;
  padding-top: 10px;
}

.meta {
  border-left: 1px solid #444;
  text-align: right;
  padding: 5px 8px;
  font-size: 16px;
  font-weight: 800;
  line-height: 24px;
}

/* SELLER */

.seller {
  height: 105px;
  text-align: center;
  border-bottom: 2px solid #444;
  padding: 11px 8px;
  font-size: 12px;
  line-height: 18px;
}

.seller .name {
  font-family: Georgia, serif;
  font-size: 30px;
  font-weight: 700;
}

/* PARTY */

.party {
  height: 95px;
  border-bottom: 1px solid #444;
  padding: 10px 8px;
  font-size: 12px;
  line-height: 18px;
}

.party .name,
.party .addr {
  font-size: 16px;
  line-height: 20px;
}

.party .name {
  font-weight: 800;
}

/* TABLE */

.table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.table th,
.table td {
  border: 1px solid #aaa;
  padding: 7px;
  font-size: 10.5px;
}

.table th {
  font-size: 10px;
  text-align: center;
  height: 36px;
}

.table .desc {
  width: 55%;
  text-align: left;
}

.table th:nth-child(2) {
  width: 12%;
}

.table th:nth-child(3) {
  width: 8%;
}

.table th:nth-child(4) {
  width: 12%;
}

.table th:nth-child(5) {
  width: 13%;
}

.r {
  text-align: right;
}

.empty td {
  height: 260px;
}

/* SUMMARY */

.summary {
  height: 100px;
  min-height: 100px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 318px;
  border-top: 1px solid #444;
  flex: none;
}

.words {
  height: 100px;
  min-height: 100px;
  padding: 10px;
  font-size: 12px;
  border-right: 1px solid #444;
  box-sizing: border-box;
}

.words b {
  display: block;
  margin-bottom: 5px;
  font-size: 12px;
}

.words > div {
  font-size: 12px;
  line-height: 16px;
}

.totals {
  height: 100px;
  min-height: 100px;
  display: grid;
  grid-template-rows: repeat(5, 1fr);
  font-size: 10px;
}

.tr {
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  border-bottom: 1px solid #aaa;
}

.grand {
  font-size: 12px;
  font-weight: 800;
}

/* BOTTOM */

.decl {
  height: 100px;
  min-height: 100px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-top: 1px solid #444;
}

.half {
  height: 100px;
  padding: 12px 8px;
  font-size: 10px;
  position: relative;
}

.decl .half:first-child {
  grid-column: 2;
  grid-row: 1;
  text-align: right;
  border-right: 0;
}

.decl .half:last-child {
  grid-column: 1;
  grid-row: 1;
  text-align: left;
  border-right: 1px solid #444;
}

.decl b {
  display: block;
  margin-bottom: 7px;
  font-size: 10.5px;
}

.decltext {
  font-size: 12px;
  line-height: 16px;
}

.auth {
  position: absolute;
  right: 8px;
  bottom: 15px;
  font-weight: 700;
  font-size: 10px;
}

/* PRODUCT DETAILS */

.pn {
  font-weight: 800;
  font-size: 10.5px;
  margin-bottom: 3px;
}

.ih,
.ir {
  display: grid;
  grid-template-columns: 110px 45px;
  gap: 8px;
}

.ih {
  font-weight: 800;
  font-size: 9px;
  margin: 4px 0 2px;
  text-transform: uppercase;
}

.ir {
  font-size: 9px;
  line-height: 13px;
  font-weight: 400;
}

.pt {
  font-weight: 700;
  font-size: 9px;
  margin-top: 3px;
}

</style>

</head>

<body>

<div class="paper">

<div class="frame">

<!-- HEADER -->

<div class="top">

  <div class="title">
    TAX INVOICE
  </div>

  <div class="meta">

    <div>
      INVOICE NO:
      <strong>${esc(invoice.invoiceNo || "")}</strong>
    </div>

    <div>
      DATE:
      <strong>${esc(invoice.date || "")}</strong>
    </div>

  </div>

</div>


<!-- SELLER -->

<div class="seller">

  <div class="name">
    ${esc(invoice.companyName || "YOUR COMPANY NAME")}
  </div>

  <div>
    ${esc(invoice.companyAddress || "")}
  </div>

  <div>
    ${esc(invoice.phone || "")}
    ${invoice.phone && invoice.email ? " • " : ""}
    ${esc(invoice.email || "")}
  </div>

  <div>
    GSTIN: ${esc(invoice.gstin || "")}
  </div>

</div>


<!-- PARTY -->

<div class="party">

  <b>PARTY'S NAME:</b>

  <div class="name">
    ${esc(invoice.partyName || "")}
  </div>

  <div class="addr">
    ${esc(invoice.partyAddress || "")}
  </div>

  <div>
    GSTIN: ${esc(invoice.partyGstin || "—")}
  </div>

</div>


<!-- ITEMS -->

<table class="table">

<thead>

<tr>

  <th class="desc">
    Description
  </th>

  <th>
    HSN Code
  </th>

  <th>
    Qty
  </th>

  <th>
    Rate
  </th>

  <th>
    Amount
  </th>

</tr>

</thead>

<tbody>

${rows}

<tr class="empty">
  <td></td>
  <td></td>
  <td></td>
  <td></td>
  <td></td>
</tr>

</tbody>

</table>


<!-- SUMMARY -->

<div class="summary">

  <div class="words">

    <b>
      Total Amount (Rs. in Words):
    </b>

    <div>
      ${words(grandTotal)} Rupees Only
    </div>

  </div>


  <div class="totals">

    <div class="tr">
      <span>Total</span>
      <b>${money(subtotal)}</b>
    </div>

    ${taxRows}

    <div class="tr">
      <span>Round Off</span>
      <span>${money(roundOff)}</span>
    </div>

    <div class="tr grand">
      <span>Grand Total</span>
      <b>${money(grandTotal)}</b>
    </div>

  </div>

</div>


<!-- DECLARATION / SIGNATURE -->

<div class="decl">

  <!-- SIGNATURE RIGHT -->

  <div class="half">

    <b>
      For ${esc(invoice.companyName || "")}
    </b>

    <div class="auth">
      Authorized Signatory
    </div>

  </div>


  <!-- DECLARATION LEFT -->

  <div class="half">

    <b>
      Declaration
    </b>

    <div class="decltext">
      I declare that this invoice shows the actual price
      of the jobwork and all the particulars are true and
      correct to the best of my knowledge.
    </div>

  </div>

</div>


</div>

</div>

</body>
</html>
`;
}

export default async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        error: "Method not allowed",
      }),
    };
  }

  let browser;

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      invoice = {},
      products = [],
      subtotal = 0,
      cgst = 0,
      sgst = 0,
      igst = 0,
      roundOff = 0,
      grandTotal = 0,
      taxRate = 5,
    } = body;

    const html = buildInvoiceHtml({
      invoice,
      products,
      subtotal,
      cgst,
      sgst,
      igst,
      roundOff,
      grandTotal,
      taxRate,
    });

    chromium.setGraphicsMode = false;

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    await page.close();

    const fileName =
      String(invoice.invoiceNo || "tax-invoice")
        .replace(/[^a-zA-Z0-9_-]/g, "_") + ".pdf";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
      isBase64Encoded: true,
      body: Buffer.from(pdf).toString("base64"),
    };
  } catch (error) {
    console.error("PDF generation error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        error: "PDF generation failed",
        details: error?.message || String(error),
      }),
    };
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        console.error("Browser close error:", error);
      }
    }
  }
}
