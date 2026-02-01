-- Add organization_id to bank_transactions if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bank_transactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bank_transactions' AND column_name = 'organization_id') THEN
            ALTER TABLE public.bank_transactions ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
            CREATE INDEX idx_bank_txns_org_id ON public.bank_transactions(organization_id);
            ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
            
            DROP POLICY IF EXISTS "Org Access Bank Txns" ON public.bank_transactions;
            EXECUTE 'CREATE POLICY "Org Access Bank Txns" ON public.bank_transactions USING (organization_id IN (SELECT org_id FROM public.current_user_org_ids())) WITH CHECK (organization_id IN (SELECT org_id FROM public.current_user_org_ids()))';
        END IF;
    END IF;
END $$;
