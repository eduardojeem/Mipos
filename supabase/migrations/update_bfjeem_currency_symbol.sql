DO $$
DECLARE v_org UUID;
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE slug = 'bfjeem-org';

  IF v_org IS NOT NULL THEN
    UPDATE public.settings s
    SET value = jsonb_set(
                  jsonb_set(s.value, '{storeSettings,currencySymbol}', '"Gs."', false),
                  '{storeSettings,currency}', '"PYG"', false
                ),
        updated_at = NOW()
    WHERE s.key = 'business_config' AND s.organization_id = v_org;
  END IF;
END $$;
