# Avatar Upload Setup

This guide explains how to set up Supabase Storage for avatar image uploads.

## Prerequisites

- Supabase project created
- Basic database setup completed (run `supabase-setup.sql`)

## Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Enable** (needed for public profile pages)
   - **File size limit**: 5MB (or your preferred limit)
   - **Allowed MIME types**: `image/*` (or specific types like `image/jpeg,image/png,image/webp`)

## Step 2: Configure Storage Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies.

**Quick Setup**: Run the `storage-policies.sql` file in Supabase SQL Editor for the easiest setup.

**Manual Setup**: Follow the policies below:

### Policy 1: Allow authenticated users to upload avatars

```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 2: Allow users to update their own avatar

```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 3: Allow users to delete their own avatar

```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

### Policy 4: Allow public read access (for profile pages)

```sql
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

## Step 3: Alternative Simple Policy (Recommended)

If you want a simpler setup that allows authenticated users to upload to any path in the avatars bucket:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Allow public read access
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

## Step 4: Run Database Migration

Make sure you've run the updated `supabase-setup.sql` which includes the `avatar_url` column:

```sql
-- This should already be in supabase-setup.sql
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
  END IF;
END $$;
```

## Testing

1. **Upload an avatar:**
   - Go to `/profile`
   - Click "Change Photo"
   - Select an image file
   - Click "Upload"

2. **Verify the avatar displays:**
   - Check that the avatar appears in your profile edit page
   - Visit `/u/{your-handle}` to see if it appears on your public profile

3. **Check Storage:**
   - Go to Supabase Dashboard → Storage → avatars
   - Verify your uploaded file appears there

## File Naming Convention

The app uploads files with this naming pattern:
- Format: `{user-id}-{timestamp}.{extension}`
- Example: `123e4567-e89b-12d3-a456-426614174000-1234567890.png`
- Path: Directly in bucket root (not in a subfolder)

## Security Notes

- **File validation**: The app validates file type (must be an image) and size (max 5MB)
- **Public access**: Avatars are publicly readable so they can be displayed on profile pages
- **User-specific**: Each user can only upload/update/delete their own avatar files
- **Old file cleanup**: When a user uploads a new avatar, the old one is automatically deleted

## Troubleshooting

### Error: "new row violates row-level security policy"
- **Most common issue**: Storage policies haven't been set up yet
- **Solution**: 
  1. Run the `storage-policies.sql` file in Supabase SQL Editor (easiest)
  2. Or manually create the policies using the SQL in Step 3 above
- Verify the bucket exists and is set to **Public**
- Make sure you're authenticated when uploading
- Check that RLS is enabled on the storage.objects table

### Error: "Bucket not found"
- Make sure you created the `avatars` bucket in Storage
- Verify the bucket name is exactly `avatars` (lowercase)

### Error: "Permission denied"
- Check that RLS policies are created and enabled
- Verify the user is authenticated
- Ensure policies allow the operation you're trying to perform

### Avatar not displaying
- Check that the `avatar_url` is saved in the profiles table
- Verify the URL is publicly accessible (check browser console)
- Make sure the bucket is set to **Public**

### Upload fails silently
- Check browser console for errors
- Verify file size is under the limit
- Ensure file type is a valid image format
- Check Supabase logs in the dashboard

## Configuration Options

You can customize the upload behavior by modifying these values in `src/app/profile/page.tsx`:

- **Max file size**: Change `5 * 1024 * 1024` (currently 5MB)
- **Allowed file types**: Modify the `accept="image/*"` attribute
- **Storage bucket name**: Change `"avatars"` in the upload function
