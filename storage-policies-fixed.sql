-- ============================================
-- Supabase Storage Policies for Avatars (Fixed)
-- Run this to fix RLS policy violations
-- ============================================

-- Note: Make sure you've created the 'avatars' bucket in Supabase Dashboard → Storage
-- The bucket should be set to Public
-- Make sure RLS is enabled on the storage.objects table

-- ============================================
-- STEP 1: Drop ALL existing policies to start fresh
-- ============================================

-- Drop all existing avatar-related policies
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- ============================================
-- STEP 2: Create policies that allow authenticated users to upload/update/delete
-- ============================================

-- Policy 1: Allow authenticated users to upload to avatars bucket
-- This allows any authenticated user to upload files to the avatars bucket
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Policy 2: Allow authenticated users to update files in avatars bucket
-- This allows users to update any file (needed for replacing avatars)
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

-- Policy 3: Allow authenticated users to delete files from avatars bucket
-- This allows users to delete files (needed for cleaning up old avatars)
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Policy 4: Allow public read access (for profile pages)
-- This allows anyone to view avatar images
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- ============================================
-- DONE! Storage policies have been created.
-- ============================================
-- 
-- IMPORTANT: After running this script, verify:
-- 1. The 'avatars' bucket exists in Supabase Dashboard → Storage
-- 2. The bucket is set to "Public" (not private)
-- 3. RLS is enabled on storage.objects (this is usually automatic)
-- ============================================
