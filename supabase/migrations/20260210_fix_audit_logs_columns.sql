begin;

-- Ensure audit_logs has required columns
alter table if exists public.audit_logs
  add column if not exists record_id text;

alter table if exists public.audit_logs
  add column if not exists action text;

alter table if exists public.audit_logs
  add column if not exists changed_by uuid;

alter table if exists public.audit_logs
  add column if not exists changes jsonb;

alter table if exists public.audit_logs
  add column if not exists organization_id uuid;

alter table if exists public.audit_logs
  add column if not exists created_at timestamptz not null default now();

commit;
