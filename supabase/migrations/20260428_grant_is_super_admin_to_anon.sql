begin;

do $$
begin
  if to_regprocedure('public.is_super_admin()') is not null then
    grant execute on function public.is_super_admin() to anon;
  end if;
end $$;

commit;
