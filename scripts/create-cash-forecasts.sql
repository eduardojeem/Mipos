-- Pronóstico diario de caja consolidada (caja + bancos)
CREATE TABLE IF NOT EXISTS cash_forecast_daily (
  day date PRIMARY KEY,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  inflows numeric(14,2) NOT NULL DEFAULT 0,
  outflows numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance numeric(14,2) NOT NULL DEFAULT 0,
  confidence numeric(5,2) NOT NULL DEFAULT 0 -- 0-100
);

CREATE INDEX IF NOT EXISTS idx_cash_forecast_day ON cash_forecast_daily(day);