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
