BEGIN;

-- Attach audit trigger to settings table for business config changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_settings_audit'
  ) THEN
    EXECUTE 'CREATE TRIGGER trg_settings_audit AFTER INSERT OR UPDATE OR DELETE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.fn_log_table_changes()';
  END IF;
END $$;

COMMIT;

