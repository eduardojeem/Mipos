-- Cuentas bancarias para Cash Management
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, -- nombre interno
  bank_name text NOT NULL,
  account_number_masked text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);