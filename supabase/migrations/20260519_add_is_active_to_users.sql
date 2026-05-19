-- Add is_active column to public.users
-- Motivación: el código de /superadmin/users y la UI de activate/deactivate
-- esperan un flag de estado a nivel de usuario. Actualmente solo existe
-- user_roles.is_active (por rol asignado), lo cual es insuficiente para
-- bloquear el acceso de un usuario al sistema completo.
--
-- Default true para no desactivar usuarios existentes al aplicar la migración.

BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Backfill: cualquier usuario sin user_roles activos se considera inactivo.
-- Comentado por defecto para preservar el comportamiento "fail open".
-- Descomenta si prefieres reflejar el estado real basado en user_roles:
--
-- UPDATE public.users u
-- SET is_active = false
-- WHERE NOT EXISTS (
--   SELECT 1 FROM public.user_roles ur
--   WHERE ur.user_id = u.id AND ur.is_active = true
-- );

CREATE INDEX IF NOT EXISTS users_is_active_idx ON public.users(is_active);

COMMIT;
