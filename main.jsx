import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Plus, Trash2, Download, Printer, Save, RotateCcw, FileText,
  Building2, UserRound, Settings2, Eye, X, Search
} from "lucide-react";
import "./styles.css";

const defaultInvoice = {
  invoiceNo: "1",
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
  gstRate: 5,
  products: [
    { id: crypto.randomUUID(), name: "", hsn: "", rate: 0,
      items: [{ id: crypto.randomUUID(), dcNo: "", pcs: 1 }] }
  ]
};

function money(value) {
  return Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
function rateDisplay(value) {
  const raw = String(value ?? "").trim();
  if (raw === "") return "";
  const num = Number(raw);
  if (!Number.isFinite(num)) return raw;
  return num.toLocaleString("en-IN", { useGrouping: true, maximumFractionDigits: 20 });
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

async function readApiResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned ${response.status} instead of JSON. Make sure the /api folder was uploaded to GitHub and DATABASE_URL is set in Vercel.`
    );
  }
}

async function getNextInvoiceNumber() {
  const response = await fetch("/api/next-invoice-number");
  const result = await readApiResponse(response);
  if (!response.ok) throw new Error(result.error || "Could not get next invoice number");
  return result.invoiceNo;
}

function normalizeInvoiceRow(row) {
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    date: String(row.invoice_date || "").slice(0, 10),
    ...row.data,
    invoiceNo: row.invoice_no,
    date: String(row.invoice_date || row.data?.date || "").slice(0, 10),
  };
}

function App() {
  const [invoice, setInvoice] = useState(() => ({ ...defaultInvoice, invoiceNo: "" }));
  const [invoiceId, setInvoiceId] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingNumber, setLoadingNumber] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historySearch, setHistorySearch] = useState("");
  const printRef = useRef(null);

  const productTotals = useMemo(() => (
    (invoice.products || []).map(product => {
      const totalQty = (product.items || []).reduce((sum, item) => sum + Number(item.pcs || 0), 0);
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
  const addProduct = () => setInvoice(prev => ({ ...prev, products: [...(prev.products || []), { id: crypto.randomUUID(), name: "", hsn: "", rate: 0, items: [{ id: crypto.randomUUID(), dcNo: "", pcs: 1 }] }] }));
  const removeProduct = id => setInvoice(prev => ({ ...prev, products: prev.products.length === 1 ? [{ id: crypto.randomUUID(), name: "", hsn: "", rate: 0, items: [{ id: crypto.randomUUID(), dcNo: "", pcs: 1 }] }] : prev.products.filter(p => p.id !== id) }));
  const addProductItem = productId => setInvoice(prev => ({ ...prev, products: prev.products.map(p => p.id === productId ? { ...p, items: [...p.items, { id: crypto.randomUUID(), dcNo: "", pcs: 1 }] } : p) }));
  const updateProductItem = (productId, itemId, key, value) => setInvoice(prev => ({ ...prev, products: prev.products.map(p => p.id === productId ? { ...p, items: p.items.map(i => i.id === itemId ? { ...i, [key]: value } : i) } : p) }));
  const removeProductItem = (productId, itemId) => setInvoice(prev => ({ ...prev, products: prev.products.map(p => { if (p.id !== productId) return p; const items = p.items.length === 1 ? [{ id: crypto.randomUUID(), dcNo: "", pcs: 1 }] : p.items.filter(i => i.id !== itemId); return { ...p, items }; }) }));
  const save = async () => {
    if (!invoice.invoiceNo.trim()) { alert("Enter an invoice number"); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/invoices", {
        method: invoiceId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: invoiceId,
          invoiceNo: invoice.invoiceNo,
          date: invoice.date,
          data: invoice
        })
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || "Could not save invoice");
      setInvoiceId(result.id);
      setInvoice({ ...result.data, invoiceNo: result.invoice_no, date: String(result.invoice_date).slice(0, 10) });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  };

  const startNewInvoice = async (ask = true) => {
    if (ask && !confirm("Start a new invoice? Current unsaved data will be cleared.")) return;
    try {
      setLoadingNumber(true);
      const nextNo = await getNextInvoiceNumber();
      setInvoice({ ...defaultInvoice, invoiceNo: nextNo, date: new Date().toISOString().slice(0, 10), products: [{ id: crypto.randomUUID(), name: "", hsn: "", rate: 0, items: [{ id: crypto.randomUUID(), dcNo: "", pcs: 1 }] }] });
      setInvoiceId(null);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingNumber(false);
    }
  };

  const loadHistory = async () => {
    try {
      const query = historySearch.trim() ? `?invoiceNo=${encodeURIComponent(historySearch.trim())}` : "";
      const response = await fetch(`/api/invoices${query}`);
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.error || "Could not load invoices");
      setHistory(Array.isArray(result) ? result : []);
      setShowHistory(true);
    } catch (error) { alert(error.message); }
  };

  const openInvoice = (row) => {
    setInvoiceId(row.id);
    setInvoice(normalizeInvoiceRow(row));
    setShowHistory(false);
  };

  const downloadPdf = async () => {
    try {
      const taxRate = Number(invoice.gstRate || 0);
      const response = await fetch("/api/render-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice, products: productTotals, subtotal, gst, cgst, sgst, igst, roundOff, grandTotal, taxRate })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "PDF service failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoiceNo || "tax-invoice"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("PDF generation failed. Please check the Render PDF service.");
    }
  };
  const printInvoice = () => window.print();

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoadingNumber(true);
        const nextNo = await getNextInvoiceNumber();
        if (active && !invoiceId) setInvoice(prev => ({ ...prev, invoiceNo: nextNo }));
      } catch (error) {
        console.error(error);
        if (active && !invoice.invoiceNo) setInvoice(prev => ({ ...prev, invoiceNo: "1" }));
      } finally {
        if (active) setLoadingNumber(false);
      }
    })();
    return () => { active = false; };
  }, []);

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
          <button className="btn ghost" onClick={() => startNewInvoice(true)}><RotateCcw size={16}/> New</button>
          <button className="btn ghost" onClick={loadHistory}><Search size={16}/> Invoices</button>
          <button className="btn ghost" onClick={save} disabled={saving || loadingNumber}><Save size={16}/> {saving ? "Saving..." : saved ? "Saved" : "Save"}</button>
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
                <Field label="Invoice Number"><input className="invoice-detail-input" value={invoice.invoiceNo} readOnly={Boolean(invoiceId)} onChange={e => update("invoiceNo", e.target.value)} /></Field>
                <Field label="Invoice Date"><input className="invoice-detail-input" type="date" value={invoice.date} onChange={e => update("date", e.target.value)} /></Field>
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
              <div className="product-help">Add a product, then add multiple items under it. All PCS values are added together and multiplied by the single rate for that product.</div>
              <div className="product-list">
                {(invoice.products || []).map((product, pi) => {
                  const totalQty = product.items.reduce((sum, item) => sum + Number(item.pcs || 0), 0);
                  const totalAmount = totalQty * Number(product.rate || 0);
                  return <div className="product-card" key={product.id}>
                    <div className="product-card-head"><strong>Product {pi+1}</strong><button className="icon-btn danger" onClick={() => removeProduct(product.id)}><Trash2 size={16}/></button></div>
                    <div className="form-grid product-main-grid">
                      <Field label="Product Name"><input placeholder="Product name" value={product.name} onChange={e => updateProduct(product.id,"name",e.target.value)} /></Field>
                      <Field label="HSN Code"><input placeholder="HSN" value={product.hsn} onChange={e => updateProduct(product.id,"hsn",e.target.value)} /></Field>
                      <Field label="Single Rate"><input type="number" min="0" step="0.01" value={product.rate} onChange={e => updateProduct(product.id,"rate",e.target.value)} /></Field>
                    </div>
                    <div className="subitems-head"><span>Items under this product</span><button className="small-add" onClick={() => addProductItem(product.id)}><Plus size={14}/> Add Item</button></div>
                    <div className="subitems-labels"><span>DC NO</span><span>PCS</span><span></span></div>
                    {product.items.map(item => <div className="subitem-row" key={item.id}>
                      <input placeholder="DC No" value={item.dcNo || ""} onChange={e => updateProductItem(product.id,item.id,"dcNo",e.target.value)} />
                      <input type="number" min="0" step="1" value={item.pcs} onChange={e => updateProductItem(product.id,item.id,"pcs",e.target.value)} />
                      <button className="icon-btn danger" onClick={() => removeProductItem(product.id,item.id)}><Trash2 size={15}/></button>
                    </div>)}
                    <div className="product-total"><span>Total PCS: <b>{totalQty}</b></span><span>Rate: <b>{rateDisplay(product.rate)}</b></span><span>Product Total: <b>{money(totalAmount)}</b></span></div>
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

      {showHistory && (
        <div className="modal-backdrop" onClick={() => setShowHistory(false)}>
          <div className="modal history-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-head"><b>Saved Invoices</b><button className="icon-btn" onClick={() => setShowHistory(false)}><X size={18}/></button></div>
            <div className="history-search"><input placeholder="Search invoice number" value={historySearch} onChange={e => setHistorySearch(e.target.value)} onKeyDown={e => e.key === "Enter" && loadHistory()} /><button className="btn outline" onClick={loadHistory}><Search size={15}/> Search</button></div>
            <div className="history-list">
              {history.length === 0 ? <div className="history-empty">No invoices found.</div> : history.map(row => (
                <button className="history-row" key={row.id} onClick={() => openInvoice(row)}>
                  <span><b>{row.invoice_no}</b><small>{String(row.invoice_date).slice(0, 10)}</small></span>
                  <span className="history-party">{row.data?.partyName || "No party name"}</span>
                  <span>Open</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
            <div><b>INVOICE NO:</b> <strong>{invoice.invoiceNo}</strong></div>
            <div><b>DATE:</b> <strong>{formatDate(invoice.date)}</strong></div>
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
          <div className="party-name">{invoice.partyName}</div>
          <div className="party-address">{invoice.partyAddress}</div>
          <div>GSTIN: {invoice.partyGstin || "—"}</div>
        </div>

        <table className="bill-table">
          <thead>
            <tr>
              <th className="desc">Description</th>
              <th>HSN Code</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.products || []).map(product => {
              const totalQty = product.items.reduce((sum,item) => sum + Number(item.pcs || 0), 0);
              const amount = totalQty * Number(product.rate || 0);
              return <tr key={product.id}>
                <td className="desc">
  <div className="pdf-product-name">{product.name || "Product"}</div>
  <div className="pdf-item-heading"><span>DC NO</span><span>PCS</span></div>
  {product.items.map(item => (
    <div className="pdf-product-item" key={item.id}>
      <span>{item.dcNo || "—"}</span><span>{item.pcs || 0}</span>
    </div>
  ))}
  <div className="pdf-product-total">Total PCS: {totalQty}</div>
</td>
                <td>{product.hsn}</td><td className="right">{totalQty || ""}</td><td className="right">{rateDisplay(product.rate)}</td><td className="right">{money(amount)}</td>
              </tr>;
            })}
            <tr className="empty-space"><td></td><td></td><td></td><td></td><td></td></tr>
          </tbody>
        </table>

        <div className="invoice-summary-row">
          <div className="words">
            <b>Total Amount (Rs. in Words):</b>
            <div>{numberToWordsIndian(grandTotal)} Rupees Only</div>
          </div>
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

        <div className="declaration-signature">
          <div className="signature-half">
            <div><b>For {invoice.companyName}</b></div>
            <div className="authorized">Authorized Signatory</div>
          </div>
          <div className="declaration-half">
            <b>Declaration</b>
            <div>I declare that this invoice shows the actual price of the jobwork and all the particulars are true and correct to the best of my knowledge.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
