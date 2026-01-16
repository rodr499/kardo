-- Add RLS policy for super admins to insert cards
-- Run this in Supabase SQL Editor if you're getting RLS policy violations when generating cards

-- Drop the policy if it exists (safe to run multiple times)
DROP POLICY IF EXISTS "Super admins can insert cards" ON cards;

-- Create the policy for super admins to insert cards
CREATE POLICY "Super admins can insert cards"
  ON cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  );
