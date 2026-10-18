# Siva Sakthi Hosiery Invoice Billing Website

## Party and product dropdowns
- Use **Add Party** to save a party name, address and GSTIN. Saved parties appear in the party dropdown. Selecting a party fills those three invoice fields automatically.
- Use **Add Product Type** to save a product name, HSN code and rate. Saved products appear in each product dropdown. Selecting one fills product name, HSN and rate.
- **Add Product to Invoice** still adds another product row to the current invoice. **Add Item** continues to add DC No / PCS rows under a product.
- Party and product masters are currently stored in this browser's local storage. They remain available in the same browser/device, but are not shared between devices or browsers. Clearing site data will clear these master lists. Invoice saving/history continues to use the existing API and Neon database.

## Deployment
1. Keep the existing Vercel `DATABASE_URL` environment variable.
2. Upload the updated files to the existing project/repository, preserving any deployment configuration and PDF-generation files already present in your repository.
3. Deploy using `npm run build` with Vite output directory `dist`.
4. Test adding/selecting parties and products, invoice saving/history, and PDF download after deployment.

## Important
The files supplied in this chat did not include `render-pdf.js` or deployment configuration files such as `vercel.json`. Preserve those files from your existing repository when updating it; they may be required by the current PDF and API routing setup.
