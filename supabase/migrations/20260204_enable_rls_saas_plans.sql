-- Enable RLS on saas_plans table
ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Super admins can view all plans
CREATE POLICY "Super admins can view all plans"
  ON saas_plans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Policy: Super admins can insert plans
CREATE POLICY "Super admins can insert plans"
  ON saas_plans
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Policy: Super admins can update plans
CREATE POLICY "Super admins can update plans"
  ON saas_plans
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Policy: Super admins can delete plans
CREATE POLICY "Super admins can delete plans"
  ON saas_plans
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'SUPER_ADMIN'
    )
  );

-- Policy: All authenticated users can view active plans (for plan selection)
CREATE POLICY "Authenticated users can view active plans"
  ON saas_plans
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
  );
