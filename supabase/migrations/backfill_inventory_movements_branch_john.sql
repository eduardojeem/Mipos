DO $$
DECLARE org UUID; central UUID; norte UUID;
BEGIN
  SELECT id INTO org FROM public.organizations WHERE slug='john-espinoza-org';
  IF org IS NULL THEN RETURN; END IF;
  SELECT id INTO central FROM public.branches WHERE organization_id=org AND slug='central';
  SELECT id INTO norte FROM public.branches WHERE organization_id=org AND slug='norte';
  UPDATE public.inventory_movements SET branch_id=central WHERE organization_id=org AND branch_id IS NULL AND movement_type IN ('IN','OUT','ADJUSTMENT');
  UPDATE public.inventory_movements SET branch_id=(reference_id::uuid) WHERE organization_id=org AND branch_id IS NULL AND movement_type='TRANSFER' AND reference_id ~* '^[0-9a-f\-]+';
END $$;

