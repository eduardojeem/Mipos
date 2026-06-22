-- =============================================================================
-- MIGRATION: 20260619_seat_limit_trigger
-- Trigger que previene exceder el límite de asientos del plan al crear
-- una invitación o membresía. Esto complementa el check application-level
-- para prevenir race conditions (dos invitaciones simultáneas).
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.check_seat_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_max_users INT;
    v_current_usage INT;
BEGIN
    -- Obtener el límite de usuarios del plan (desde plan_subscriptions + saas_plans)
    SELECT COALESCE(
        (SELECT (sp.limits->>'maxUsers')::int
         FROM public.plan_subscriptions ps
         JOIN public.saas_plans sp ON sp.id = ps.plan_id
         WHERE ps.organization_id = NEW.organization_id
           AND ps.status = 'ACTIVE'
         LIMIT 1),
        999999  -- Sin plan = ilimitado
    ) INTO v_plan_max_users;

    -- Si es ilimitado, permitir siempre
    IF v_plan_max_users >= 999999 OR v_plan_max_users <= 0 THEN
        RETURN NEW;
    END IF;

    -- Contar miembros ACTIVE + invitaciones PENDING
    SELECT
        (SELECT COUNT(*) FROM public.organization_members
         WHERE organization_id = NEW.organization_id AND status = 'ACTIVE')
        +
        (SELECT COUNT(*) FROM public.invitations
         WHERE organization_id = NEW.organization_id AND status = 'PENDING')
    INTO v_current_usage;

    IF v_current_usage >= v_plan_max_users THEN
        RAISE EXCEPTION 'Límite de asientos del plan alcanzado (% de %)', v_current_usage, v_plan_max_users
            USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger en invitations: solo al crear una PENDING
DROP TRIGGER IF EXISTS trg_check_seat_limit_invitation ON public.invitations;
CREATE TRIGGER trg_check_seat_limit_invitation
    BEFORE INSERT ON public.invitations
    FOR EACH ROW
    WHEN (NEW.status = 'PENDING')
    EXECUTE FUNCTION public.check_seat_limit();

-- Trigger en organization_members: solo al crear con status ACTIVE
DROP TRIGGER IF EXISTS trg_check_seat_limit_member ON public.organization_members;
CREATE TRIGGER trg_check_seat_limit_member
    BEFORE INSERT ON public.organization_members
    FOR EACH ROW
    WHEN (NEW.status = 'ACTIVE')
    EXECUTE FUNCTION public.check_seat_limit();

COMMIT;
