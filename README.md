# Siva Sakthi Invoice Billing Website

A complete billing website built from scratch, with a billing workflow similar in purpose to the referenced invoice application, while using a new implementation and a custom A4 tax-invoice PDF layout based on the supplied sample image.

Reference application: https://sivashakthi-invoice.vercel.app/

## Features

- Invoice number and date
- Seller/company details
- Customer/party details
- Multiple invoice items
- HSN code, quantity and rate
- Automatic line totals
- CGST + SGST or IGST
- GST rate control
- Round-off and grand total
- Amount in words
- Live A4 preview
- Print invoice
- Download PDF
- Browser local-storage draft saving
- New invoice action
- Responsive desktop/tablet/mobile UI
- Vercel-ready Vite project

## Run locally

Requirements:
- Node.js 18+

Install:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Deploy to Vercel

1. Upload this folder to GitHub.
2. Import the repository into Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Deploy.

## Important

This is a front-end billing application. It does not connect to the GST portal, e-invoice API, accounting software, payment gateway, or a server database.

For production use, add authentication, server-side storage, invoice history, backups, GST validation, role permissions, and a compliant e-invoicing integration where required.

## Vercel upload structure

The repository root must look like this:

- `index.html`
- `package.json`
- `vite.config.js`
- `vercel.json`
- `src/main.jsx`
- `src/styles.css`

Do not upload the ZIP file itself as the application source, and do not put these files inside an extra nested folder.


## Product item columns
Every product supports multiple item rows with DC NO and PCS. There is no automatic 1, 2, 3 numbering. Total PCS is multiplied by the product's single rate. Rate display preserves the decimal precision entered by the user.
