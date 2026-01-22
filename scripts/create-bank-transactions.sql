-- Transacciones bancarias (feeds/open banking/CSV)
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  txn_date date NOT NULL,
  amount numeric(14,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  description text,
  external_id text, -- id externo del banco/CSV para matching
  status text NOT NULL DEFAULT 'posted', -- pending/posted/reversed
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_txn_account_date ON bank_transactions(bank_account_id, txn_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_txn_external_id ON bank_transactions(external_id);