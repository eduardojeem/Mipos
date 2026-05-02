begin;

alter table public.organization_members
  add column if not exists status text;

update public.organization_members om
set status = coalesce(nullif(upper(u.status), ''), 'ACTIVE')
from public.users u
where u.id = om.user_id
  and (om.status is null or om.status = '');

update public.organization_members
set status = 'ACTIVE'
where status is null;

alter table public.organization_members
  alter column status set default 'ACTIVE';

alter table public.organization_members
  alter column status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'organization_members_status_check'
      and conrelid = 'public.organization_members'::regclass
  ) then
    alter table public.organization_members
      add constraint organization_members_status_check
      check (status in ('ACTIVE', 'INACTIVE', 'SUSPENDED'));
  end if;
end $$;

update public.user_roles ur
set organization_id = om.organization_id
from public.organization_members om
where ur.organization_id is null
  and ur.user_id = om.user_id
  and ur.role_id = om.role_id;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'user_roles_unique'
      and conrelid = 'public.user_roles'::regclass
  ) then
    alter table public.user_roles drop constraint user_roles_unique;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_roles_user_role_org_unique'
      and conrelid = 'public.user_roles'::regclass
  ) then
    alter table public.user_roles
      add constraint user_roles_user_role_org_unique
      unique (user_id, role_id, organization_id);
  end if;
end $$;

create index if not exists idx_organization_members_org_status
  on public.organization_members (organization_id, status);

commit;
