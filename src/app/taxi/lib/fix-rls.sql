-- Fix infinite recursion in users RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Admin can view all users" ON users;

-- Create a simpler policy that avoids recursion
-- Admin can view all users (using a function to check role)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the policy using the function
CREATE POLICY "Admin can view all users" ON users
  FOR SELECT USING (is_admin());
