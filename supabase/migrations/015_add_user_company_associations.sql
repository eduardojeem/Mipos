-- Create user_company_associations table if missing
CREATE TABLE IF NOT EXISTS public.user_company_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'employee')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_company_user_id ON public.user_company_associations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_company_id ON public.user_company_associations(company_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_company_unique ON public.user_company_associations(user_id, company_id);

-- Enable RLS
ALTER TABLE public.user_company_associations ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_company_associations' AND policyname = 'Users can view their own associations'
  ) THEN
    CREATE POLICY "Users can view their own associations" ON public.user_company_associations
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_company_associations' AND policyname = 'Admins can manage company users'
  ) THEN
    CREATE POLICY "Admins can manage company users" ON public.user_company_associations
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_company_associations AS uca_admin
          WHERE uca_admin.company_id = user_company_associations.company_id
          AND uca_admin.user_id = auth.uid()
          AND uca_admin.role = 'admin'
          AND uca_admin.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_company_associations' AND policyname = 'Users can create their own association'
  ) THEN
    CREATE POLICY "Users can create their own association" ON public.user_company_associations
      FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;
