-- =============================================================================
-- MIGRATION: 20260619_create_invitations
-- Invitaciones de equipo (flujo SaaS: invitar por email en vez de crear con clave)
--
-- Una invitación PENDING ocupa un asiento del plan. Al aceptarla, se crea la
-- membresía en organization_members (status ACTIVE) con el rol asignado.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.invitations (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id   UUID        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email             TEXT        NOT NULL,
    role_id           TEXT        REFERENCES public.roles(id) ON DELETE SET NULL,
    token             TEXT        NOT NULL UNIQUE,
    status            TEXT        NOT NULL DEFAULT 'PENDING',  -- PENDING, ACCEPTED, REVOKED
    invited_by        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    expires_at        TIMESTAMPTZ NOT NULL,
    accepted_at       TIMESTAMPTZ,
    accepted_user_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT invitations_status_valid CHECK (status IN ('PENDING', 'ACCEPTED', 'REVOKED'))
);

-- Una sola invitación PENDIENTE por email dentro de la org (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS invitations_org_email_pending_unique
    ON public.invitations (organization_id, lower(email))
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS invitations_org_status_idx
    ON public.invitations (organization_id, status);
CREATE INDEX IF NOT EXISTS invitations_token_idx
    ON public.invitations (token);

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invitations_updated_at ON public.invitations;
CREATE TRIGGER trg_invitations_updated_at
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW EXECUTE FUNCTION public.set_invitations_updated_at();

-- RLS: los miembros de la org pueden ver sus invitaciones. La aceptación por
-- token se hace server-side con service_role (bypassa RLS).
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.invitations;
CREATE POLICY "Tenant Isolation" ON public.invitations
    USING (organization_id IN (SELECT unnest(get_my_org_ids())));

COMMIT;
