-- Tabla para analítica de uso de reportes
CREATE TABLE IF NOT EXISTS report_usage_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_key text NOT NULL,
  filters jsonb,
  rows_count int,
  duration_ms int,
  succeeded boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_usage_analytics_user_created
  ON report_usage_analytics(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_report_usage_analytics_report_created
  ON report_usage_analytics(report_key, created_at DESC);