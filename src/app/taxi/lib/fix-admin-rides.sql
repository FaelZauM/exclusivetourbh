-- Allow admin to insert rides for any driver
DROP POLICY IF EXISTS "Admin can insert rides" ON rides;
CREATE POLICY "Admin can insert rides" ON rides
  FOR INSERT WITH CHECK (is_admin());
