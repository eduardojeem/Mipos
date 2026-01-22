-- Alertas de saldos mínimos/máximos/volatilidad
CREATE TABLE IF NOT EXISTS cash_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL, -- min|max|volatility
  scope text NOT NULL DEFAULT 'global', -- global|account
  bank_account_id uuid REFERENCES bank_accounts(id) ON DELETE SET NULL,
  threshold numeric(14,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cash_alerts_active ON cash_alerts(active);