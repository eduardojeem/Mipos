
-- Enable RLS on categories table if not already enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access to categories
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'categories' 
        AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON "public"."categories"
        AS PERMISSIVE FOR SELECT
        TO public
        USING (true);
    END IF;
END $$;
