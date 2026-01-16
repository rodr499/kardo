# Kardo - Digital Business Card Platform

A Next.js application for creating and sharing digital business cards via NFC tags.

## Table of Contents

- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Admin Setup](#admin-setup)
- [Avatar Upload Setup](#avatar-upload-setup)
- [NFC Tag Setup](#nfc-tag-setup)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. Set up environment variables (see [Environment Variables](#environment-variables))

4. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

---

## Environment Variables

Create a `.env.local` file in the root directory with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Site URL (for production - optional but recommended)
# This ensures email redirects work correctly in production
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### Environment Variable Details

#### NEXT_PUBLIC_SUPABASE_URL
- **Required**: Yes
- **Description**: Your Supabase project URL
- **Where to find**: Supabase Dashboard → Project Settings → API → Project URL

#### NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Required**: Yes
- **Description**: Your Supabase anonymous/public key
- **Where to find**: Supabase Dashboard → Project Settings → API → anon public key

#### NEXT_PUBLIC_SITE_URL
- **Required**: No (but recommended for production)
- **Description**: Your production domain URL
- **Usage**: Used for email redirect URLs in authentication
- **Example**: `https://kardo.com` or `https://www.kardo.com`
- **Development**: If not set, uses `window.location.origin` (localhost:3000)

### Fixing Localhost Redirect Issues

If you're seeing localhost redirects in production:

1. **Set NEXT_PUBLIC_SITE_URL in production:**
   ```env
   NEXT_PUBLIC_SITE_URL=https://yourdomain.com
   ```

2. **Configure Supabase Redirect URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add to "Redirect URLs":
     - `https://yourdomain.com/auth/callback`
     - `http://localhost:3000/auth/callback` (for development)

3. **Set Site URL in Supabase:**
   - Supabase Dashboard → Authentication → URL Configuration
   - Set "Site URL" to: `https://yourdomain.com`

### Deployment Platforms

#### Vercel
Add environment variables in:
- Project Settings → Environment Variables

#### Netlify
Add in:
- Site Settings → Environment Variables

### Security Notes

- ✅ `NEXT_PUBLIC_*` variables are safe to expose (they're public)
- ❌ Never commit `.env.local` to git (it's already in `.gitignore`)
- ✅ These are client-side variables, visible in browser code

---

## Database Setup

### Step 1: Run SQL Migration

Run the `supabase-setup.sql` file in Supabase SQL Editor. This will:
- Create necessary tables (`profiles`, `cards`, `settings`)
- Add required columns with safe defaults
- Set up Row Level Security (RLS) policies
- Create triggers for automatic profile creation
- Add indexes for performance

### Step 2: Create Settings Record

Run the `settings-setup.sql` file to create the app settings record:

```sql
-- This creates the settings record if it doesn't exist
INSERT INTO settings (id, registration_enabled)
VALUES ('app', true)
ON CONFLICT (id) DO NOTHING;
```

### Step 3: Set Up Storage (for avatars)

See [Avatar Upload Setup](#avatar-upload-setup) section below.

---

## Admin Setup

This guide explains how to set up admin functionality for managing cards and users.

### Database Setup

#### Step 1: Run SQL Migration

Run the updated `supabase-setup.sql` file in Supabase SQL Editor. This will add:
- `user_type` column to `profiles` table (default: 'cardholder')
- `nfc_tag_assigned` column to `cards` table (default: false)
- Admin-specific RLS policies for:
  - Updating profiles and cards
  - Inserting new cards (for card generation)
  - Deleting cards

**Note:** If you encounter RLS policy violations, you can also run the standalone SQL files:
- `add-card-insert-policy.sql` - For card generation
- `add-card-delete-policy.sql` - For card deletion

#### Step 2: Create Your First Super Admin

After running the migration, set yourself (or another user) as a super_admin:

```sql
-- Replace 'user-email@example.com' with the email of the user you want to make admin
UPDATE profiles
SET user_type = 'super_admin'
WHERE id = (
  SELECT id FROM auth.users 
  WHERE email = 'user-email@example.com'
);
```

**Or by user ID:**
```sql
-- Replace 'user-id-here' with the actual user ID
UPDATE profiles
SET user_type = 'super_admin'
WHERE id = 'user-id-here';
```

**To find your user ID:**
```sql
-- List all users and their IDs
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
```

### Features

#### User Types

- **`super_admin`**: Has access to admin dashboard and can manage all cards
- **`cardholder`**: Default user type, normal user permissions

#### Admin Dashboard

Super admins can access `/admin` to:
- View all cards with their assignment status
- **Generate new cards** with unique random codes (Crockford Base32 format)
- **Delete cards** permanently (with password confirmation)
- Assign/unassign cards to NFC tags
- Unclaim cards from users (with password confirmation)
- Filter cards by assignment status
- Search cards by code
- View statistics (total, assigned, unassigned, claimed, unclaimed)
- Toggle registration settings (enable/disable user registration)

#### NFC Tag Assignment

The `nfc_tag_assigned` field tracks which card codes have been assigned to physical NFC tags:
- **`true`**: Code has been assigned to a physical NFC tag
- **`false`**: Code has not been assigned to a physical NFC tag yet

This is separate from the `claimed_at` field which tracks if a user has claimed the card.

### Navigation

Super admins will see an "Admin" link in the navigation bar that takes them to `/admin`.

### RLS Policies

#### Super Admin Permissions

Super admins can:
- Update any profile (including `user_type`)
- Update any card (for NFC tag assignment)
- Insert new cards (for card generation)
- Delete cards permanently
- Access all cards regardless of ownership

#### Cardholder Permissions

Cardholders can:
- Update their own profile (except `user_type`)
- Claim cards (update their own claimed cards)

### Card Management Features

#### Generating New Cards

1. **As a super_admin, go to `/admin`**
2. **Scroll to the "Generate Cards" section**
3. **Enter the number of cards** to generate (1-1000)
4. **Enter the code length** (6-16 characters, default: 8)
5. **Click "Generate Cards"**
6. Cards will be created with unique random codes in Crockford Base32 format (no I, O, 0, or 1)
7. All generated cards will have status "unclaimed" and be ready for assignment

**Note:** You may need to run `add-card-insert-policy.sql` in Supabase SQL Editor if you get RLS policy violations when generating cards.

#### Deleting Cards

1. **As a super_admin, go to `/admin`**
2. **Find the card you want to delete** in the table
3. **Click the "Delete" button** (red outlined button on the right side of Actions)
4. **Enter your password** to confirm the deletion
5. The card will be permanently deleted (this action cannot be undone)

**Note:** You may need to run `add-card-delete-policy.sql` in Supabase SQL Editor if you get RLS policy violations when deleting cards.

#### Assigning NFC Tags

1. **As a super_admin, go to `/admin`**
2. **Search or filter for the card code you want to assign**
3. **Click "Assign"** to mark the card as assigned to an NFC tag
4. **Click "Unassign"** if you need to reassign the tag (requires password confirmation)

#### Unclaiming Cards

1. **As a super_admin, go to `/admin`**
2. **Find a claimed card** you want to unclaim
3. **Click "Unclaim"** button
4. **Enter your password** to confirm
5. The card will be released from the user and set back to "unclaimed" status

### Examples

#### Making Multiple Users Admin

```sql
-- Make multiple users admin at once
UPDATE profiles
SET user_type = 'super_admin'
WHERE email IN (
  'admin1@example.com',
  'admin2@example.com',
  'admin3@example.com'
);
```

#### Remove Admin Status

```sql
-- Remove admin status (revert to cardholder)
UPDATE profiles
SET user_type = 'cardholder'
WHERE email = 'user-email@example.com';
```

### Security Notes

- Only super_admins can change `user_type` field (enforced by RLS)
- Only super_admins can access `/admin` route
- Super admins have full read/write access to all profiles and cards
- The `user_type` field is protected from being changed by regular users

---

## Avatar Upload Setup

This guide explains how to set up Supabase Storage for avatar image uploads.

### Prerequisites

- Supabase project created
- Basic database setup completed (run `supabase-setup.sql`)

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `avatars`
   - **Public bucket**: ✅ **Enable** (needed for public profile pages)
   - **File size limit**: 5MB (or your preferred limit)
   - **Allowed MIME types**: `image/*` (or specific types like `image/jpeg,image/png,image/webp`)

### Step 2: Configure Storage Policies

After creating the bucket, you need to set up Row Level Security (RLS) policies.

**Quick Setup**: Run the `storage-policies.sql` file in Supabase SQL Editor for the easiest setup.

**Manual Setup**: Follow the policies below:

#### Policy 1: Allow authenticated users to upload avatars

```sql
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: Allow users to update their own avatar

```sql
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Allow users to delete their own avatar

```sql
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 4: Allow public read access (for profile pages)

```sql
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');
```

### Step 3: Alternative Simple Policy (Recommended)

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

### Step 4: Run Database Migration

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

### Testing

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

### File Naming Convention

The app uploads files with this naming pattern:
- Format: `{user-id}-{timestamp}.{extension}`
- Example: `123e4567-e89b-12d3-a456-426614174000-1234567890.png`
- Path: Directly in bucket root (not in a subfolder)

### Security Notes

- **File validation**: The app validates file type (must be an image) and size (max 5MB)
- **Public access**: Avatars are publicly readable so they can be displayed on profile pages
- **User-specific**: Each user can only upload/update/delete their own avatar files
- **Old file cleanup**: When a user uploads a new avatar, the old one is automatically deleted

### Configuration Options

You can customize the upload behavior by modifying these values in `src/app/profile/page.tsx`:

- **Max file size**: Change `5 * 1024 * 1024` (currently 5MB)
- **Allowed file types**: Modify the `accept="image/*"` attribute
- **Storage bucket name**: Change `"avatars"` in the upload function

---

## NFC Tag Setup

### ✅ Correct NFC Tag URL Format

**Use this format for all NFC tags:**
```
https://yourdomain.com/c/{CARD_CODE}
```

### Examples:
- `https://kardo.com/c/AB7K9Q2M`
- `https://kardo.com/c/XYZ12345`

### How It Works

The `/c/[code]` route intelligently handles card lookup and redirects:

1. **Card is unclaimed** → Redirects to `/claim?code={code}`
   - User can enter their card code and sign in to claim it

2. **Card is claimed** → Redirects to `/u/{handle}`
   - Shows the card owner's profile page

3. **Card doesn't exist** → Redirects to `/unknown-card`
   - Shows error message that card wasn't found

4. **Card is disabled** → Redirects to `/card-disabled`
   - Shows message that card has been deactivated

### Benefits

✅ **Single URL format** - One URL works for life of the card
✅ **Dynamic routing** - Automatically shows claim page or profile based on status
✅ **No updates needed** - NFC tag never needs to be reprogrammed
✅ **Better UX** - Users see the right page automatically

### Migration from Old Format

If you've already programmed NFC tags with the old format (`/claim?code=...`):

**Old format (still works, but not ideal):**
- `https://yourdomain.com/claim?code=AB7K9Q2M`

**New format (recommended):**
- `https://yourdomain.com/c/AB7K9Q2M`

### Why switch?

The old format will always send users to the claim page, even after the card is claimed. The new `/c/` route automatically redirects to the profile once claimed.

### Setting Up NFC Tags

1. **Get your card code** (e.g., `AB7K9Q2M`)

2. **Create the URL:**
   ```
   https://yourdomain.com/c/AB7K9Q2M
   ```

3. **Program your NFC tag:**
   - Use an NFC writing app (iOS: Shortcuts, Android: NFC Tools)
   - Write the URL as an "URL" or "Web" record
   - Test the tag after programming

4. **Test the flow:**
   - Before claiming: Should redirect to claim page
   - After claiming: Should redirect to profile page

### Technical Details

The `/c/[code]` route (`src/app/c/[code]/route.ts`):
- Validates card code format
- Looks up card in database
- Checks card status
- Redirects appropriately based on state

---

## Troubleshooting

### Admin Issues

#### "Access Denied" on Admin Page

- Verify your user has `user_type = 'super_admin'` in the profiles table
- Check that you're logged in with the correct account
- Verify the RLS policies have been created correctly

#### Can't Update Cards as Admin

- Make sure the "Super admins can update any card" policy exists
- Verify your profile has `user_type = 'super_admin'`
- Check Supabase logs for policy violations

#### Can't Generate Cards

- Run `add-card-insert-policy.sql` in Supabase SQL Editor
- Verify the "Super admins can insert cards" policy exists
- Check that you're logged in as a super_admin
- Verify the RLS policy has been applied correctly

#### Can't Delete Cards

- Run `add-card-delete-policy.sql` in Supabase SQL Editor
- Verify the "Super admins can delete cards" policy exists
- Check that you're logged in as a super_admin
- Make sure you're entering the correct password when prompted

#### Admin Link Not Showing

- Clear browser cache and reload
- Verify your profile has `user_type = 'super_admin'`
- Check browser console for errors

### Avatar Upload Issues

#### Error: "new row violates row-level security policy"

- **Most common issue**: Storage policies haven't been set up yet
- **Solution**: 
  1. Run the `storage-policies.sql` file in Supabase SQL Editor (easiest)
  2. Or manually create the policies using the SQL in the Avatar Upload Setup section
- Verify the bucket exists and is set to **Public**
- Make sure you're authenticated when uploading
- Check that RLS is enabled on the storage.objects table

#### Error: "Bucket not found"

- Make sure you created the `avatars` bucket in Storage
- Verify the bucket name is exactly `avatars` (lowercase)

#### Error: "Permission denied"

- Check that RLS policies are created and enabled
- Verify the user is authenticated
- Ensure policies allow the operation you're trying to perform

#### Avatar not displaying

- Check that the `avatar_url` is saved in the profiles table
- Verify the URL is publicly accessible (check browser console)
- Make sure the bucket is set to **Public**

#### Upload fails silently

- Check browser console for errors
- Verify file size is under the limit
- Ensure file type is a valid image format
- Check Supabase logs in the dashboard

### Database Error: "Database error saving new user"

If you're getting a "Database error saving new user" error when users sign up:

1. **Run the updated SQL setup**:
   - Go to Supabase SQL Editor
   - Copy and paste the entire `supabase-setup.sql` file
   - Run it (this will update the trigger function with better error handling)

2. **Check if the trigger exists**:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

3. **Check if the function exists**:
   ```sql
   SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
   ```

#### Common Issues

**Issue 1: Handle Uniqueness Conflict**
- **Symptom**: Error about duplicate handle
- **Solution**: The updated trigger function now handles this automatically by appending numbers (e.g., `john`, `john-1`, `john-2`)

**Issue 2: RLS Policy Blocking**
- **Symptom**: Permission denied error
- **Solution**: The trigger function uses `SECURITY DEFINER` which should bypass RLS, but verify:
  ```sql
  -- Check RLS is enabled
  SELECT tablename, rowsecurity FROM pg_tables WHERE table_name = 'profiles';
  
  -- Check policies exist
  SELECT * FROM pg_policies WHERE tablename = 'profiles';
  ```

**Issue 3: Missing Columns**
- **Symptom**: Column doesn't exist error
- **Solution**: Run the SQL setup which adds missing columns safely

**Issue 4: Trigger Not Firing**
- **Symptom**: User created but no profile
- **Solution**: 
  ```sql
  -- Recreate the trigger
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  ```

### 404 Errors

#### Common Causes and Fixes

**1. RLS Policies Blocking Queries**

If RLS is enabled but policies are missing/incorrect, queries will return empty results (causing 404s).

**Check:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('profiles', 'cards');

-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

**Fix:** Run the `supabase-setup.sql` file to ensure all policies are created correctly.

**2. Handle Case Sensitivity**

Handles in the URL might not match database handles due to case sensitivity.

**Fix:** Updated code now uses `.ilike()` for case-insensitive lookups.

**Test:**
- Try accessing `/u/johndoe` vs `/u/JohnDoe` - both should work now
- Check database: `SELECT handle FROM profiles LIMIT 5;`

**3. Missing Profiles**

If profiles table is empty or profiles weren't created on signup.

**Check:**
```sql
-- Check if profiles exist
SELECT COUNT(*) FROM profiles;

-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```

**Fix:** Run `supabase-setup.sql` to ensure trigger is set up.

**4. Database Connection Issues**

Supabase client might not be connecting correctly.

**Check:**
- Environment variables are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase project is active and not paused
- Network connectivity

**5. Middleware Issues**

Middleware might be blocking requests incorrectly.

**Check:** 
- Review middleware matcher patterns
- Check if middleware is throwing errors

**Test:** Try accessing routes directly without going through middleware.

#### Quick Diagnostic Queries

```sql
-- Check all profiles
SELECT id, handle, display_name, email FROM profiles ORDER BY created_at DESC LIMIT 10;

-- Check all cards
SELECT code, status, profile_id FROM cards LIMIT 10;

-- Check RLS policies
SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('profiles', 'cards');

-- Test query as anon role (simulates what your app sees)
SET ROLE anon;
SELECT * FROM profiles LIMIT 1;
RESET ROLE;
```

#### Testing Steps

1. **Test Homepage:** `/` - Should work
2. **Test Login:** `/login` - Should work  
3. **Test Profile Creation:** Sign up and check if profile was created
4. **Test Profile Access:** `/u/<handle>` - Should show profile
5. **Test Card Lookup:** `/c/<code>` - Should redirect appropriately

### NFC Tag Issues

**Tag doesn't work:**
- Ensure URL is correct format: `/c/{CODE}`
- Check card code is uppercase (route handles this automatically)
- Verify card exists in database

**Always shows claim page:**
- Check card status in database
- Verify `profile_id` is set after claiming
- Check `/c/{code}` route is being used (not `/claim?code=...`)

### IP Address Redirect Issues

When accessing the app via IP address (e.g., `http://192.168.68.124:3000`), redirects may go to `localhost` instead of the IP address.

**Solution:** The code has been updated to correctly extract the origin from the request URL, which preserves IP addresses, localhost, and domain names correctly.

**What Changed:**

All redirect routes now use:
```typescript
const requestUrl = new URL(req.url);
const origin = `${requestUrl.protocol}//${requestUrl.host}`;
```

This ensures:
- ✅ `http://192.168.68.124:3000` stays as IP address
- ✅ `http://localhost:3000` stays as localhost  
- ✅ `https://yourdomain.com` stays as domain

**Testing:**

1. Access via IP: `http://192.168.68.124:3000/c/ABC123`
2. Should redirect to: `http://192.168.68.124:3000/...` (not localhost)

**Supabase Configuration:**

Make sure Supabase redirect URLs include your IP:

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add to "Redirect URLs":
   - `http://192.168.68.124:3000/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback`

**Note**: IP addresses change, so you may need to update this when your network IP changes.

### Clearing Cache

If you're experiencing issues with old code or cached content:

1. **Clear Browser Cache**
   - **Chrome/Edge:** Press `Cmd+Shift+Delete` (Mac) or `Ctrl+Shift+Delete` (Windows)
   - Select "Cached images and files"
   - Select "All time" or "Last hour"
   - Click "Clear data"
   - **Or Hard Refresh:** `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

2. **Restart Dev Server**
   ```bash
   # Stop the current dev server (Ctrl+C)
   # Then restart:
   npm run dev
   ```

3. **Clear Next.js Build Cache**
   ```bash
   rm -rf .next
   npm run dev
   ```

4. **If Still Seeing Old Page**
   - Force quit browser and reopen
   - Open in Incognito/Private window
   - Check browser dev tools: Right-click refresh button → "Empty Cache and Hard Reload"
   - Clear service workers: DevTools → Application tab → Service Workers → Unregister

---

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
