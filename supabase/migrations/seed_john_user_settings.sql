DO $$
DECLARE au UUID;
BEGIN
  SELECT id INTO au FROM auth.users WHERE lower(email)=lower('johneduardoespinoza95@gmail.com');
  IF au IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_settings (user_id, theme, language)
  VALUES (au, 'dark', 'es-PY')
  ON CONFLICT (user_id) DO UPDATE SET theme='dark', language='es-PY';
END $$;

