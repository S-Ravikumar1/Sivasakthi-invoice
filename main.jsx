import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Plus, Trash2, Download, Printer, Save, RotateCcw, FileText,
  Building2, UserRound, Settings2, Eye, X, Search
} from "lucide-react";
import "./styles.css";

const STORAGE_KEY = "siva-sakthi-invoice-v1";

const defaultInvoice = {
  invoiceNo: "00008/2024-25",
  date: new Date().toISOString().slice(0, 10),
  companyName: "SIVA SAKTHI HOSIERY",
  companyAddress: "123 Street Address, City, Tamil Nadu, 000000",
  phone: "Phone Number",
  email: "Email",
  gstin: "33ABCD1234A1Z5",
  partyName: "CUSTOMER NAME",
  partyAddress: "Customer Address, City, State, PIN",
  partyGstin: "",
  taxMode: "cgstsgst",
  gstRate: 18,
  products: [
    { id: crypto.randomUUID(), name: "", hsn: "", rate: 0,
      items: [{ id: crypto.randomUUID(), name: "", qty: 1 }] }
  ]
};

function loadInvoice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultInvoice;
    const data = { ...defaultInvoice, ...JSON.parse(saved) };
    if (!data.products && data.items) {
      data.products = data.items.map(item => ({
        id: crypto.randomUUID(), name: item.description || "", hsn: item.hsn || "", rate: item.rate || 0,
        items: [{ id: crypto.randomUUID(), name: item.description || "", qty: item.qty || 1 }]
      }));
      delete data.items;
    }
    return data;
  } catch { return defaultInvoice; }
}

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2
  });
}

function numberToWordsIndian(number) {
  let n = Math.round(Number(number || 0));
  if (!n) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const under1000 = (x) => {
    let s = "";
    if (x >= 100) { s += ones[Math.floor(x / 100)] + " Hundred"; x %= 100; if (x) s += " "; }
    if (x >= 20) { s += tens[Math.floor(x / 10)]; x %= 10; if (x) s += " " + ones[x]; }
    else if (x) s += ones[x];
    return s;
  };
  let s = "";
  if (n >= 10000000) { s += under1000(Math.floor(n / 10000000)) + " Crore"; n %= 10000000; if (n) s += " "; }
  if (n >= 100000) { s += under1000(Math.floor(n / 100000)) + " Lakh"; n %= 100000; if (n) s += " "; }
  if (n >= 1000) { s += under1000(Math.floor(n / 1000)) + " Thousand"; n %= 1000; if (n) s += " "; }
  if (n) s += under1000(n);
  return s;
}

function formatDate(value) {
  if (!value) return "";
  const d = new Date(value + "T00:00:00");
  return d.toLocaleDateString("en-IN");
}

function App() {
  const [invoice, setInvoice] = useState(loadInvoice);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef(null);

  const productTotals = useMemo(() => (
    (invoice.products || []).map(product => {
      const totalQty = (product.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
      return { ...product, totalQty, amount: totalQty * Number(product.rate || 0) };
    })
  ), [invoice.products]);

  const subtotal = productTotals.reduce((sum, product) => sum + product.amount, 0);
  const gst = subtotal * Number(invoice.gstRate || 0) / 100;
  const cgst = invoice.taxMode === "cgstsgst" ? gst / 2 : 0;
  const sgst = invoice.taxMode === "cgstsgst" ? gst / 2 : 0;
  const igst = invoice.taxMode === "igst" ? gst : 0;
  const exactTotal = subtotal + gst;
  const grandTotal = Math.round(exactTotal);
  const roundOff = grandTotal - exactTotal;
  const update = (key, value) => setInvoice(prev => ({ ...prev, [key]: value }));
  const updateProduct = (id, key, value) => setInvoice(prev => ({ ...prev, products: prev.products.map(p => p.id === id ? { ...p, [key]: value } : p) }));
  const addProduct = () => setInvoice(prev => ({ ...prev, products: [...(prev.products || []), { id: crypto.randomUUID(), name: "", hsn: "", rate: 0, items: [{ id: crypto.randomUUID(), name: "", qty: 1 }] }] }));
  const removeProduct = id => setInvoice(prev => ({ ...prev, products: prev.products.length === 1 ? [{ id: crypto.randomUUID(), name: "", hsn: "", rate: 0, items: [{ id: crypto.randomUUID(), name: "", qty: 1 }] }] : prev.products.filter(p => p.id !== id) }));
  const addProductItem = productId => setInvoice(prev => ({ ...prev, products: prev.products.map(p => p.id === productId ? { ...p, items: [...p.items, { id: crypto.randomUUID(), name: "", qty: 1 }] } : p) }));
  const updateProductItem = (productId, itemId, key, value) => setInvoice(prev => ({ ...prev, products: prev.products.map(p => p.id === productId ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, [key]: value } : i) } : p) }));
  const removeProductItem = (productId, itemId) => setInvoice(prev => ({ ...prev, products: prev.products.map(p => { if (p.id !== productId) return p; const items = p.items.length === 1 ? [{ id: crypto.randomUUID(), name: "", qty: 1 }] : p.items.filter(i => i.id !== itemId); return { ...p, items }; }) }));
  const save = () => { localStorage.setItem(STORAGE_KEY, JSON.stringify(invoice)); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const reset = () => { if (!confirm("Start a new invoice? Current unsaved data will be cleared.")) return; setInvoice({ ...defaultInvoice, invoiceNo: "", date: new Date().toISOString().slice(0,10), products: [{ id: crypto.randomUUID(), name: "", hsn: "", rate: 0, items: [{ id: crypto.randomUUID(), name: "", qty: 1 }] }] }); localStorage.removeItem(STORAGE_KEY); };
  const downloadPdf = async () => { const { jsPDF } = await import("jspdf"); const html2canvas = (await import("html2canvas")).default; const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true }); const pdf = new jsPDF("p", "mm", "a4"); const ratio = Math.min(210 / canvas.width, 297 / canvas.height); pdf.addImage(canvas.toDataURL("image/png"), "PNG", (210-canvas.width*ratio)/2, 0, canvas.width*ratio, canvas.height*ratio); pdf.save(`${invoice.invoiceNo || "tax-invoice"}.pdf`); };
  const printInvoice = () => window.print();

  useEffect(() => {
    document.title = `${invoice.companyName || "Invoice"} - ${invoice.invoiceNo || "Tax Invoice"}`;
  }, [invoice.companyName, invoice.invoiceNo]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><FileText size={20}/></div>
          <div>
            <div className="brand-title">Siva Sakthi Hosiery</div>
            <div className="brand-subtitle">Invoice & Billing</div>
          </div>
        </div>
        <div className="top-actions">
          <button className="btn ghost" onClick={reset}><RotateCcw size={16}/> New</button>
          <button className="btn ghost" onClick={save}><Save size={16}/> {saved ? "Saved" : "Save"}</button>
          <button className="btn dark" onClick={() => setShowPreview(true)}><Eye size={16}/> Preview</button>
        </div>
      </header>

      <div className="page">
        <div className="page-heading">
          <div>
            <h1>Create Invoice</h1>
            <p>Enter billing details and generate a professional tax invoice.</p>
          </div>
          <div className="heading-actions">
            <button className="btn outline" onClick={printInvoice}><Printer size={16}/> Print</button>
            <button className="btn primary" onClick={downloadPdf}><Download size={16}/> Download PDF</button>
          </div>
        </div>

        <div className="workspace">
          <section className="editor">
            <div className="card">
              <div className="card-title"><Settings2 size={18}/> Invoice Details</div>
              <div className="form-grid two">
                <Field label="Invoice Number"><input value={invoice.invoiceNo} onChange={e => update("invoiceNo", e.target.value)} /></Field>
                <Field label="Invoice Date"><input type="date" value={invoice.date} onChange={e => update("date", e.target.value)} /></Field>
              </div>
            </div>

            <div className="card">
              <div className="card-title"><Building2 size={18}/> Seller Details</div>
              <div className="form-grid two">
                <Field label="Company Name"><input value={invoice.companyName} onChange={e => update("companyName", e.target.value)} /></Field>
                <Field label="GSTIN"><input value={invoice.gstin} onChange={e => update("gstin", e.target.value.toUpperCase())} /></Field>
                <Field label="Address" full><textarea value={invoice.companyAddress} onChange={e => update("companyAddress", e.target.value)} /></Field>
                <Field label="Phone"><input value={invoice.phone} onChange={e => update("phone", e.target.value)} /></Field>
                <Field label="Email"><input value={invoice.email} onChange={e => update("email", e.target.value)} /></Field>
              </div>
            </div>

            <div className="card">
              <div className="card-title"><UserRound size={18}/> Customer / Party Details</div>
              <div className="form-grid two">
                <Field label="Party Name"><input value={invoice.partyName} onChange={e => update("partyName", e.target.value)} /></Field>
                <Field label="Customer GSTIN"><input value={invoice.partyGstin} onChange={e => update("partyGstin", e.target.value.toUpperCase())} /></Field>
                <Field label="Address" full><textarea value={invoice.partyAddress} onChange={e => update("partyAddress", e.target.value)} /></Field>
              </div>
            </div>

            <div className="card">
              <div className="card-head-row"><div className="card-title"><FileText size={18}/> Products</div><button className="small-add" onClick={addProduct}><Plus size={15}/> Add Product</button></div>
              <div className="product-help">Add a product, then add multiple items under it. All item quantities are combined and multiplied by the single rate for that product.</div>
              <div className="product-list">
                {(invoice.products || []).map((product, pi) => {
                  const totalQty = product.items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
                  const totalAmount = totalQty * Number(product.rate || 0);
                  return <div className="product-card" key={product.id}>
                    <div className="product-card-head"><strong>Product {pi+1}</strong><button className="icon-btn danger" onClick={() => removeProduct(product.id)}><Trash2 size={16}/></button></div>
                    <div className="form-grid product-main-grid">
                      <Field label="Product Name"><input placeholder="Product name" value={product.name} onChange={e => updateProduct(product.id,"name",e.target.value)} /></Field>
                      <Field label="HSN Code"><input placeholder="HSN" value={product.hsn} onChange={e => updateProduct(product.id,"hsn",e.target.value)} /></Field>
                      <Field label="Single Rate"><input type="number" min="0" step="0.01" value={product.rate} onChange={e => updateProduct(product.id,"rate",e.target.value)} /></Field>
                    </div>
                    <div className="subitems-head"><span>Items under this product</span><button className="small-add" onClick={() => addProductItem(product.id)}><Plus size={14}/> Add Item</button></div>
                    {product.items.map((item,ii) => <div className="subitem-row" key={item.id}><span className="subitem-number">{ii+1}</span><input placeholder="Item description / size / color" value={item.name} onChange={e => updateProductItem(product.id,item.id,"name",e.target.value)} /><input type="number" min="0" step="0.01" value={item.qty} onChange={e => updateProductItem(product.id,item.id,"qty",e.target.value)} /><button className="icon-btn danger" onClick={() => removeProductItem(product.id,item.id)}><Trash2 size={15}/></button></div>)}
                    <div className="product-total"><span>Total Qty: <b>{totalQty}</b></span><span>Rate: <b>{money(product.rate)}</b></span><span>Product Total: <b>{money(totalAmount)}</b></span></div>
                  </div>;
                })}
              </div>
            </div>

            <div className="card">
              <div className="card-title"><Settings2 size={18}/> Tax Settings</div>
              <div className="form-grid two">
                <Field label="Tax Type">
                  <select value={invoice.taxMode} onChange={e => update("taxMode", e.target.value)}>
                    <option value="cgstsgst">CGST + SGST</option>
                    <option value="igst">IGST</option>
                  </select>
                </Field>
                <Field label="GST Rate (%)"><input type="number" min="0" step="0.01" value={invoice.gstRate} onChange={e => update("gstRate", e.target.value)} /></Field>
              </div>
            </div>
          </section>

          <aside className="preview-panel">
            <div className="preview-toolbar">
              <div><b>Live Preview</b><span> A4 invoice</span></div>
              <button className="icon-btn" onClick={() => setShowPreview(true)}><Eye size={17}/></button>
            </div>
            <div className="preview-scroll">
              <InvoicePaper
                invoice={invoice}
                subtotal={subtotal}
                cgst={cgst}
                sgst={sgst}
                igst={igst}
                roundOff={roundOff}
                grandTotal={grandTotal}
                printRef={printRef}
              />
            </div>
          </aside>
        </div>
      </div>

      {showPreview && (
        <div className="modal-backdrop" onClick={() => setShowPreview(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><b>Invoice Preview</b><button className="icon-btn" onClick={() => setShowPreview(false)}><X size={18}/></button></div>
            <div className="modal-body"><InvoicePaper invoice={invoice} subtotal={subtotal} cgst={cgst} sgst={sgst} igst={igst} roundOff={roundOff} grandTotal={grandTotal} /></div>
            <div className="modal-foot"><button className="btn outline" onClick={printInvoice}><Printer size={16}/> Print</button><button className="btn primary" onClick={downloadPdf}><Download size={16}/> PDF</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, full }) {
  return <label className={`field ${full ? "full" : ""}`}><span>{label}</span>{children}</label>;
}

function InvoicePaper({ invoice, subtotal, cgst, sgst, igst, roundOff, grandTotal, printRef }) {
  const taxRate = Number(invoice.gstRate || 0);
  return (
    <div className="invoice-paper" ref={printRef}>
      <div className="invoice-frame">
        <div className="invoice-top">
          <div className="tax-title">TAX INVOICE</div>
          <div className="invoice-meta">
            <div><b>INVOICE NO:</b> {invoice.invoiceNo}</div>
            <div><b>DATE:</b> {formatDate(invoice.date)}</div>
          </div>
        </div>

        <div className="seller-block">
          <div className="seller-name">{invoice.companyName || "YOUR COMPANY NAME"}</div>
          <div>{invoice.companyAddress}</div>
          <div>{invoice.phone}{invoice.phone && invoice.email ? " • " : ""}{invoice.email}</div>
          <div>GSTIN: {invoice.gstin}</div>
        </div>

        <div className="party-block">
          <b>PARTY'S NAME:</b>
          <div>{invoice.partyName}</div>
          <div>{invoice.partyAddress}</div>
          <div>GSTIN: {invoice.partyGstin || "—"}</div>
        </div>

        <table className="bill-table">
          <thead>
            <tr>
              <th className="desc">Particular (Description & Specification)</th>
              <th>HSN Code</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.products || []).map(product => {
              const totalQty = product.items.reduce((sum,item) => sum + Number(item.qty || 0), 0);
              const amount = totalQty * Number(product.rate || 0);
              return <tr key={product.id}>
                <td className="desc"><div className="pdf-product-name">{product.name || "Product"}</div>{product.items.map((item,index) => <div className="pdf-product-item" key={item.id}>{index+1}. {item.name || "Item"} — Qty {item.qty || 0}</div>)}<div className="pdf-product-total">Total Qty: {totalQty}</div></td>
                <td>{product.hsn}</td><td className="right">{totalQty || ""}</td><td className="right">{money(product.rate)}</td><td className="right">{money(amount)}</td>
              </tr>;
            })}
            <tr className="empty-space"><td></td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>

        <div className="invoice-bottom no-terms">
          <div></div>
          <div className="totals">
            <div className="total-row"><span>Total</span><b>{money(subtotal)}</b></div>
            {invoice.taxMode === "cgstsgst" ? <>
              <div className="total-row"><span>Add : CGST @ {(taxRate/2).toFixed(2)}%</span><span>{money(cgst)}</span></div>
              <div className="total-row"><span>Add : SGST @ {(taxRate/2).toFixed(2)}%</span><span>{money(sgst)}</span></div>
            </> : <div className="total-row"><span>Add : IGST @ {taxRate.toFixed(2)}%</span><span>{money(igst)}</span></div>}
            <div className="total-row"><span>Round Off</span><span>{money(roundOff)}</span></div>
            <div className="total-row grand"><span>Grand Total</span><b>{money(grandTotal)}</b></div>
          </div>
        </div>

        <div className="words"><b>Total Amount (Rs. in Words):</b> {numberToWordsIndian(grandTotal)} Rupees Only</div>

        <div className="signature">
          <div><b>For {invoice.companyName}</b></div>
          <div className="authorized">Authorized Signatory</div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
