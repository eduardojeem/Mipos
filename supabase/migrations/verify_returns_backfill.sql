DO $$
DECLARE cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM public.returns WHERE organization_id IS NULL;
  IF cnt > 0 THEN
    RAISE EXCEPTION 'Backfill failed: % rows with NULL organization_id in returns', cnt;
  END IF;
END $$;

