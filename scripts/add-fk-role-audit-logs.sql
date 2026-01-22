-- Add FK from role_audit_logs.user_id to public.users(id)
ALTER TABLE public.role_audit_logs
  ADD CONSTRAINT fk_role_audit_logs_user
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL
  NOT VALID;

-- Validate the constraint after creation
ALTER TABLE public.role_audit_logs
  VALIDATE CONSTRAINT fk_role_audit_logs_user;