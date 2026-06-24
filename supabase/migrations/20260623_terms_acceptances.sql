-- ============================================================================
-- MIGRATION: 20260623_terms_acceptances
-- Purpose: Append-only audit log of terms/privacy acceptances.
-- Wired to: app/api/auth/register/route.ts (best-effort insert on signup).
-- NOTA: validar en Supabase dev antes de dar por buena (workflow del proyecto).
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.terms_acceptances (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid,
  terms_version   text NOT NULL,
  source          text,              -- 'signup' | 'customer-register' | 'checkout'
  ip              text,
  user_agent      text,
  accepted_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_terms_acceptances_user
  ON public.terms_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_terms_acceptances_org
  ON public.terms_acceptances(organization_id);

COMMENT ON TABLE public.terms_acceptances IS
  'Registro append-only de aceptaciones de Términos/Privacidad. Lo escribe el backend con service role (bypassa RLS). Los usuarios solo pueden leer las propias.';

-- RLS: log de auditoría. Las inserciones las hace el backend con service role
-- (bypassa RLS). No se da policy de INSERT a usuarios → no pueden falsificar
-- registros. Solo pueden LEER los suyos.
ALTER TABLE public.terms_acceptances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS terms_acceptances_select_own ON public.terms_acceptances;
CREATE POLICY terms_acceptances_select_own ON public.terms_acceptances
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMIT;
