import { jsPDF } from "jspdf";

const text = (v) => String(v ?? "");
const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rateText = (v) => {
  const raw = text(v).trim();
  if (!raw) return "";
  const n = Number(raw);
  return Number.isFinite(n) ? n.toLocaleString("en-IN", { useGrouping: true, maximumFractionDigits: 20 }) : raw;
};
function words(value) {
  let n = Math.round(Number(value || 0));
  if (!n) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const under = (x) => { let s=""; if(x>=100){s+=ones[Math.floor(x/100)]+" Hundred";x%=100;if(x)s+=" ";} if(x>=20){s+=tens[Math.floor(x/10)];x%=10;if(x)s+=" "+ones[x];} else if(x)s+=ones[x];return s; };
  let s=""; if(n>=1e7){s+=under(Math.floor(n/1e7))+" Crore";n%=1e7;if(n)s+=" ";} if(n>=1e5){s+=under(Math.floor(n/1e5))+" Lakh";n%=1e5;if(n)s+=" ";} if(n>=1e3){s+=under(Math.floor(n/1e3))+" Thousand";n%=1e3;if(n)s+=" ";} if(n)s+=under(n); return s;
}
function dateText(v) { if (!v) return ""; const d = new Date(String(v).slice(0,10)+"T00:00:00"); return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN"); }
function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Method not allowed" }); }
  try {
    const invoice = req.body?.invoice || {};
    const products = Array.isArray(invoice.products) ? invoice.products : [];
    const taxRate = Number(invoice.gstRate || 0);
    const productRows = products.map(p => { const items = Array.isArray(p.items) ? p.items : []; const qty = items.reduce((s,i)=>s+Number(i.pcs||0),0); return {...p, items, qty, amount:qty*Number(p.rate||0)}; });
    const subtotal = productRows.reduce((s,p)=>s+p.amount,0);
    const tax = subtotal*taxRate/100;
    const cgst = invoice.taxMode === "igst" ? 0 : tax/2;
    const sgst = invoice.taxMode === "igst" ? 0 : tax/2;
    const igst = invoice.taxMode === "igst" ? tax : 0;
    const grandTotal = Math.round(subtotal+tax);
    const roundOff = grandTotal-(subtotal+tax);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const black = [17,17,17];
    pdf.setDrawColor(...black); pdf.setTextColor(25,25,25); pdf.setLineWidth(0.35); pdf.setFont("helvetica","normal");
    const x0=8, x1=105, x2=128.28, x3=151.56, x4=174.84, x5=202;
    const y0=8, y1=20, y2=48, y3=73, y4=85, y5=236, y6=262.5, y7=289;
    // Draw each shared border exactly once as vector geometry to avoid doubled cell edges.
    pdf.rect(x0,y0,x5-x0,y7-y0);
    [y1,y2,y3,y4,y5,y6].forEach(y=>pdf.line(x0,y,x5,y));
    [x1].forEach(x=>pdf.line(x,y0,x,y1));
    [x0,x5].forEach(()=>{});
    // Seller/party/table divisions and summary/signature split
    [x1].forEach(x=>pdf.line(x,y6,x,y7));
    [x1,x2,x3,x4].forEach(x=>pdf.line(x,y3,x,y5));
    [x1].forEach(x=>pdf.line(x,y5,x,y6));
    [x1].forEach(x=>pdf.line(x,y6,x,y7));
    // Header metadata vertical divider
    pdf.line(x1,y0,x1,y1);
    // Header text
    pdf.setFont("helvetica","bold"); pdf.setFontSize(12); pdf.text("TAX INVOICE",56.5,15.4,{align:"center"});
    pdf.setFontSize(8.5); pdf.text(`INVOICE NO: ${text(invoice.invoiceNo)}`,199.5,12.2,{align:"right"}); pdf.text(`DATE: ${dateText(invoice.date)}`,199.5,17.1,{align:"right"});
    // Seller block
    pdf.setFont("helvetica","bold"); pdf.setFontSize(18); pdf.text(text(invoice.companyName||"YOUR COMPANY NAME"),105,29.5,{align:"center",maxWidth:185});
    pdf.setFont("helvetica","normal"); pdf.setFontSize(9); pdf.text(text(invoice.companyAddress),105,34.3,{align:"center",maxWidth:185});
    pdf.text([text(invoice.phone),text(invoice.email)].filter(Boolean).join(" • "),105,39.2,{align:"center",maxWidth:185});
    pdf.text(`GSTIN: ${text(invoice.gstin)}`,105,44.0,{align:"center",maxWidth:185});
    // Customer block
    pdf.setFontSize(8.5); pdf.setFont("helvetica","bold"); pdf.text("PARTY'S NAME:",10,53.5);
    pdf.setFontSize(11); pdf.text(text(invoice.partyName),10,58.5,{maxWidth:185});
    pdf.setFont("helvetica","normal"); pdf.setFontSize(9); pdf.text(text(invoice.partyAddress),10,63.2,{maxWidth:185}); pdf.text(`GSTIN: ${text(invoice.partyGstin||"—")}`,10,68.0,{maxWidth:185});
    // Table headings
    pdf.setFont("helvetica","bold"); pdf.setFontSize(8.5);
    pdf.text("Description",10,80.2); pdf.text("HSN Code",(x1+x2)/2,80.2,{align:"center"}); pdf.text("Qty in pcs",(x2+x3)/2,80.2,{align:"center"}); pdf.text("Rate per",(x3+x4)/2,78.2,{align:"center"}); pdf.text("pcs",(x3+x4)/2,82.1,{align:"center"}); pdf.text("Amount",(x4+x5)/2,80.2,{align:"center"});
    // Product details; no extra horizontal product separators.
    let py=90;
    pdf.setFontSize(8.5);
    for (const p of productRows) {
      if (py > 193) break;
      pdf.setFont("helvetica","normal"); pdf.text(text(p.name||"Product"),10,py,{maxWidth:91});
      pdf.text(text(p.hsn),x2-2,py,{align:"right",maxWidth:20});
      pdf.text(p.qty ? String(p.qty) : "",x3-2,py,{align:"right"});
      pdf.text(rateText(p.rate),x4-2,py,{align:"right",maxWidth:20});
      pdf.text(money(p.amount),x5-3,py,{align:"right",maxWidth:24});
      py += 8;
      pdf.setFont("helvetica","bold"); pdf.setFontSize(7.5); pdf.text("DC NO",x0+16,py,{align:"center"}); pdf.text("PCS",x0+54,py,{align:"center"}); py += 4;
      pdf.setFont("helvetica","normal");
      for (const item of p.items) { if (py > 195) break; pdf.text(text(item.dcNo||"—"),x0+16,py,{align:"center",maxWidth:30}); pdf.text(text(item.pcs||0),x0+54,py,{align:"center"}); py+=4; }
      pdf.setFont("helvetica","bold"); pdf.setFontSize(7.5); pdf.text(`Total PCS: ${p.qty}`,x0+35,py+1,{align:"center"}); py+=9; pdf.setFontSize(8.5);
    }
    // Five equal total rows with single vector separators
    pdf.setFont("helvetica","normal"); pdf.setFontSize(8.5); pdf.text("Total Amount (Rs. in Words):",10,y5+7);
    pdf.setFont("helvetica","bold"); pdf.text(`${words(grandTotal)} Rupees Only`,10,y5+12.5,{maxWidth:90});
    const tx=x1+2, amountX=x5-3, rowH=(y6-y5)/5;
    const totals=[ ["Total",money(subtotal),true], ...(invoice.taxMode === "igst" ? [[`Add : IGST @ ${taxRate.toFixed(2)}%`,money(igst),false]] : [[`Add : CGST @ ${(taxRate/2).toFixed(2)}%`,money(cgst),false],[`Add : SGST @ ${(taxRate/2).toFixed(2)}%`,money(sgst),false]]), ["Round Off",money(roundOff),false], ["Grand Total",money(grandTotal),true] ];
    // Normalize to five rows if tax mode differs.
    while(totals.length<5) totals.splice(totals.length-1,0,["", "", false]);
    totals.slice(0,5).forEach((r,i)=>{ const yy=y5+i*rowH; if(i>0) pdf.line(x1,yy,x5,yy); pdf.setFont("helvetica",r[2]?"bold":"normal"); pdf.setFontSize(r[0]==="Grand Total"?9:8.2); pdf.text(r[0],tx,yy+rowH*0.62); pdf.text(r[1],amountX,yy+rowH*0.62,{align:"right"}); });
    // Declaration and signature halves
    pdf.line(x1,y6,x1,y7);
    pdf.setFont("helvetica","bold"); pdf.setFontSize(8.5); pdf.text("Declaration",10,y6+5.5); pdf.text(`For ${text(invoice.companyName||"")}`,199.5,y6+5.5,{align:"right",maxWidth:90});
    pdf.setFont("helvetica","normal"); pdf.setFontSize(8); const decl="I declare that this invoice shows the actual price of the jobwork and all the particulars are true and correct to the best of my knowledge."; pdf.text(pdf.splitTextToSize(decl,91),10,y6+11.5);
    pdf.setFont("helvetica","bold"); pdf.setFontSize(8.5); pdf.text("Authorized Signatory",199.5,284.5,{align:"right"});
    const bytes=Buffer.from(pdf.output("arraybuffer"));
    res.setHeader("Content-Type","application/pdf"); res.setHeader("Content-Disposition",`attachment; filename="${text(invoice.invoiceNo||"tax-invoice").replace(/[^a-zA-Z0-9_-]/g,"_")}.pdf"`); res.setHeader("Cache-Control","no-store"); return res.status(200).send(bytes);
  } catch (e) { console.error("Vector PDF generation failed",e); return res.status(500).json({error:"PDF generation failed"}); }
}
export default handler;
