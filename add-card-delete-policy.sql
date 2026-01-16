-- Add RLS policy for super admins to delete cards
-- Run this in Supabase SQL Editor if you're getting RLS policy violations when deleting cards

-- Drop the policy if it exists (safe to run multiple times)
DROP POLICY IF EXISTS "Super admins can delete cards" ON cards;

-- Create the policy for super admins to delete cards
CREATE POLICY "Super admins can delete cards"
  ON cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  );
