-- user_branches: assigns users to specific branches within an organization.
-- A user can belong to multiple branches; a branch can have multiple users.
-- If no row exists for a user, they have access to all branches of their org (default open).
-- Admins/owners are NOT restricted by this table — they always see all branches.

CREATE TABLE IF NOT EXISTS public.user_branches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id     UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branches_user_id     ON public.user_branches (user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch_id   ON public.user_branches (branch_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_org_id      ON public.user_branches (organization_id);

ALTER TABLE public.user_branches ENABLE ROW LEVEL SECURITY;

-- Anyone in the org can read assignments (needed to build the selector)
DROP POLICY IF EXISTS user_branches_read ON public.user_branches;
CREATE POLICY user_branches_read ON public.user_branches
  FOR SELECT USING (organization_id IN (SELECT unnest(get_my_org_ids())));

-- Only org members can insert/update/delete assignments; the API enforces role checks
DROP POLICY IF EXISTS user_branches_write ON public.user_branches;
CREATE POLICY user_branches_write ON public.user_branches
  FOR ALL USING (belongs_to_org(organization_id))
  WITH CHECK (belongs_to_org(organization_id));

COMMENT ON TABLE public.user_branches IS
  'Maps users to branches they are allowed to operate in. If a user has no rows here, they inherit full org access (for sellers/cashiers this should be restricted via API logic).';
COMMENT ON COLUMN public.user_branches.assigned_by IS 'The admin/owner who made the assignment.';
