-- Audit logs and soft delete utilities
-- Idempotent migration: safe to run multiple times

begin;

-- Ensure required extension for gen_random_uuid
create extension if not exists pgcrypto;

-- Audit logs table
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null,
  changed_by uuid,
  changes jsonb,
  organization_id uuid,
  created_at timestamptz not null default now()
);

-- Add missing column defensively
alter table public.audit_logs
  add column if not exists table_name text;

-- Function: log table changes to audit_logs
create or replace function public.fn_log_table_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := null;
begin
  -- Try to capture JWT user id if available
  begin
    v_user := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub', null)::uuid;
  exception when others then
    v_user := null;
  end;

  if TG_OP = 'INSERT' then
    insert into public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    values (TG_TABLE_NAME, coalesce((NEW).id::text, ''), 'INSERT', v_user, to_jsonb(NEW), (NEW).organization_id);
    return NEW;
  elsif TG_OP = 'UPDATE' then
    insert into public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    values (TG_TABLE_NAME, coalesce((NEW).id::text, ''), 'UPDATE', v_user, to_jsonb(NEW), (NEW).organization_id);
    return NEW;
  elsif TG_OP = 'DELETE' then
    insert into public.audit_logs(table_name, record_id, action, changed_by, changes, organization_id)
    values (TG_TABLE_NAME, coalesce((OLD).id::text, ''), 'DELETE', v_user, to_jsonb(OLD), (OLD).organization_id);
    return OLD;
  end if;
  return null;
end;$$;

-- Soft delete function: convert DELETE into setting deleted_at
create or replace function public.fn_soft_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only apply if table has deleted_at column
  if exists (
    select 1
    from information_schema.columns
    where table_schema = TG_TABLE_SCHEMA
      and table_name = TG_TABLE_NAME
      and column_name = 'deleted_at'
  ) then
    execute format('update %I.%I set deleted_at = now() where id = $1', TG_TABLE_SCHEMA, TG_TABLE_NAME)
      using OLD.id;
  end if;
  return null; -- swallow the delete
end;$$;

-- Ensure deleted_at column exists on key tables
alter table if exists public.products add column if not exists deleted_at timestamptz;
alter table if exists public.customers add column if not exists deleted_at timestamptz;
alter table if exists public.sales add column if not exists deleted_at timestamptz;
alter table if exists public.sale_items add column if not exists deleted_at timestamptz;

-- Attach audit + soft delete triggers to key tables (create if not exists pattern)
do $$
begin
  -- products
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_products_audit'
  ) then
    execute 'create trigger trg_products_audit after insert or update or delete on public.products for each row execute function public.fn_log_table_changes()';
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_products_soft_delete'
  ) then
    execute 'create trigger trg_products_soft_delete before delete on public.products for each row execute function public.fn_soft_delete()';
  end if;

  -- customers
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_customers_audit'
  ) then
    execute 'create trigger trg_customers_audit after insert or update or delete on public.customers for each row execute function public.fn_log_table_changes()';
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_customers_soft_delete'
  ) then
    execute 'create trigger trg_customers_soft_delete before delete on public.customers for each row execute function public.fn_soft_delete()';
  end if;

  -- sales
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_sales_audit'
  ) then
    execute 'create trigger trg_sales_audit after insert or update or delete on public.sales for each row execute function public.fn_log_table_changes()';
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_sales_soft_delete'
  ) then
    execute 'create trigger trg_sales_soft_delete before delete on public.sales for each row execute function public.fn_soft_delete()';
  end if;

  -- sale_items
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_sale_items_audit'
  ) then
    execute 'create trigger trg_sale_items_audit after insert or update or delete on public.sale_items for each row execute function public.fn_log_table_changes()';
  end if;
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_sale_items_soft_delete'
  ) then
    execute 'create trigger trg_sale_items_soft_delete before delete on public.sale_items for each row execute function public.fn_soft_delete()';
  end if;
end$$;

commit;
