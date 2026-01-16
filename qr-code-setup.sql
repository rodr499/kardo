-- ============================================
-- QR Code Setup for Kardo
-- Adds qr_code_url column to profiles table
-- Safe to run on existing tables with data
-- ============================================

-- Add qr_code_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'qr_code_url') THEN
    ALTER TABLE profiles ADD COLUMN qr_code_url TEXT;
  END IF;
END $$;
