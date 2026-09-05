-- Add RLS policy for drivers to view invitations sent to them
CREATE POLICY "Driver can view invitations" ON driver_invitations
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Add policy for drivers to update invitation status (accept/reject)
CREATE POLICY "Driver can update invitations" ON driver_invitations
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );
