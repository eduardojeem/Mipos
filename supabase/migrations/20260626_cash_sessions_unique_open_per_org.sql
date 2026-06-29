-- Prevent multiple OPEN cash sessions per organization.
-- A partial unique index enforces at DB level that only one row per
-- organization_id can have status = 'OPEN', making concurrent open
-- attempts fail with a unique-violation error instead of silently
-- creating duplicate sessions.
CREATE UNIQUE INDEX IF NOT EXISTS cash_sessions_one_open_per_org
  ON cash_sessions (organization_id)
  WHERE (status = 'OPEN');
