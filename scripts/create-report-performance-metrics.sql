-- Tabla para métricas de rendimiento de reportes
CREATE TABLE IF NOT EXISTS report_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  report_key text NOT NULL,
  phase text, -- e.g., fetch, render, export
  duration_ms int NOT NULL,
  succeeded boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_performance_report_created
  ON report_performance_metrics(report_key, created_at DESC);