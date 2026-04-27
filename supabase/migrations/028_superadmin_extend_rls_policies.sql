begin;

do $$
begin
  if to_regclass('public.superadmin_settings') is not null then
    alter table public.superadmin_settings enable row level security;

    drop policy if exists "Superadmin full access" on public.superadmin_settings;

    create policy "Superadmin full access"
      on public.superadmin_settings
      for all
      using (public.is_super_admin())
      with check (public.is_super_admin());
  end if;
end $$;

do $$
begin
  if to_regclass('public.saas_plans') is not null then
    alter table public.saas_plans enable row level security;

    drop policy if exists "Public read plans" on public.saas_plans;
    drop policy if exists "Public read active plans" on public.saas_plans;
    drop policy if exists "Authenticated users can view active plans" on public.saas_plans;
    drop policy if exists "Super admin manage plans" on public.saas_plans;
    drop policy if exists "Super admins can view all plans" on public.saas_plans;
    drop policy if exists "Super admins can insert plans" on public.saas_plans;
    drop policy if exists "Super admins can update plans" on public.saas_plans;
    drop policy if exists "Super admins can delete plans" on public.saas_plans;

    create policy "Public read active plans"
      on public.saas_plans
      for select
      using (is_active = true);

    create policy "Super admin manage plans"
      on public.saas_plans
      for all
      using (public.is_super_admin())
      with check (public.is_super_admin());
  end if;
end $$;

do $$
begin
  if to_regclass('public.saas_subscriptions') is not null then
    alter table public.saas_subscriptions enable row level security;

    drop policy if exists "Super admin view all subs" on public.saas_subscriptions;

    create policy "Super admin view all subs"
      on public.saas_subscriptions
      for select
      using (public.is_super_admin());
  end if;
end $$;

do $$
begin
  if to_regclass('public.saas_plans') is not null then
    grant select on public.saas_plans to anon, authenticated;
    grant all privileges on public.saas_plans to service_role;
  end if;

  if to_regclass('public.saas_subscriptions') is not null then
    grant all privileges on public.saas_subscriptions to service_role;
  end if;
end $$;

do $$
begin
  if to_regclass('public.audit_logs') is not null then
    alter table public.audit_logs enable row level security;

    drop policy if exists "Super admins can view audit logs" on public.audit_logs;
    drop policy if exists "Super admins can insert audit logs" on public.audit_logs;
    drop policy if exists "Super admins can update audit logs" on public.audit_logs;
    drop policy if exists "Super admins can delete audit logs" on public.audit_logs;

    create policy "Super admins can view audit logs"
      on public.audit_logs
      for select
      using (public.is_super_admin());

    create policy "Super admins can insert audit logs"
      on public.audit_logs
      for insert
      with check (public.is_super_admin());
  end if;
end $$;

do $$
begin
  if to_regprocedure('public.get_organization_db_size(uuid)') is not null then
    revoke all on function public.get_organization_db_size(uuid) from public;
    revoke all on function public.get_organization_db_size(uuid) from authenticated;
    grant execute on function public.get_organization_db_size(uuid) to service_role;
  end if;

  if to_regprocedure('public.get_database_performance_metrics()') is not null then
    revoke all on function public.get_database_performance_metrics() from public;
    revoke all on function public.get_database_performance_metrics() from authenticated;
    grant execute on function public.get_database_performance_metrics() to service_role;
  end if;

  if to_regprocedure('public.get_largest_tables(integer)') is not null then
    revoke all on function public.get_largest_tables(integer) from public;
    revoke all on function public.get_largest_tables(integer) from authenticated;
    grant execute on function public.get_largest_tables(integer) to service_role;
  end if;

  if to_regprocedure('public.get_unused_indexes()') is not null then
    revoke all on function public.get_unused_indexes() from public;
    revoke all on function public.get_unused_indexes() from authenticated;
    grant execute on function public.get_unused_indexes() to service_role;
  end if;

  if to_regprocedure('public.get_organization_record_counts(uuid)') is not null then
    revoke all on function public.get_organization_record_counts(uuid) from public;
    revoke all on function public.get_organization_record_counts(uuid) from authenticated;
    grant execute on function public.get_organization_record_counts(uuid) to service_role;
  end if;
end $$;

commit;

