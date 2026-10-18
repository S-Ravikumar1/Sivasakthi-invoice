CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_invoice_no TEXT NOT NULL,
  suffix INTEGER NOT NULL DEFAULT 0,
  invoice_no TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (base_invoice_no, suffix)
);

CREATE INDEX IF NOT EXISTS invoices_base_invoice_no_idx ON invoices(base_invoice_no);
CREATE INDEX IF NOT EXISTS invoices_created_at_idx ON invoices(created_at DESC);

CREATE TABLE IF NOT EXISTS parties (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  party_name VARCHAR(200) NOT NULL,
  party_address TEXT NOT NULL DEFAULT '',
  gstin VARCHAR(20) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_name VARCHAR(200) NOT NULL,
  hsn_code VARCHAR(20) NOT NULL DEFAULT '',
  rate NUMERIC(18, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parties_name ON parties (party_name);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (product_name);
