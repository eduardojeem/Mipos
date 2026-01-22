-- Conciliaciones entre banco y libro (caja)
CREATE TABLE IF NOT EXISTS cash_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  bank_balance numeric(14,2) NOT NULL,
  ledger_balance numeric(14,2) NOT NULL, -- saldo según sistema
  difference numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending/matched/disputed/resolved
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_recon_account_period ON cash_reconciliations(bank_account_id, period_end DESC);