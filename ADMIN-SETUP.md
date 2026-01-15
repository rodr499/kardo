# Admin Setup Guide

This guide explains how to set up admin functionality for tracking NFC tag assignments.

## Database Setup

### Step 1: Run SQL Migration

Run the updated `supabase-setup.sql` file in Supabase SQL Editor. This will add:
- `user_type` column to `profiles` table (default: 'cardholder')
- `nfc_tag_assigned` column to `cards` table (default: false)
- Admin-specific RLS policies

### Step 2: Create Your First Super Admin

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

## Features

### User Types

- **`super_admin`**: Has access to admin dashboard and can manage all cards
- **`cardholder`**: Default user type, normal user permissions

### Admin Dashboard

Super admins can access `/admin` to:
- View all cards with their assignment status
- Assign/unassign cards to NFC tags
- Filter cards by assignment status
- Search cards by code
- View statistics (total, assigned, unassigned, claimed, unclaimed)

### NFC Tag Assignment

The `nfc_tag_assigned` field tracks which card codes have been assigned to physical NFC tags:
- **`true`**: Code has been assigned to a physical NFC tag
- **`false`**: Code has not been assigned to a physical NFC tag yet

This is separate from the `claimed_at` field which tracks if a user has claimed the card.

## Navigation

Super admins will see an "Admin" link in the navigation bar that takes them to `/admin`.

## RLS Policies

### Super Admin Permissions

Super admins can:
- Update any profile (including `user_type`)
- Update any card (for NFC tag assignment)
- Access all cards regardless of ownership

### Cardholder Permissions

Cardholders can:
- Update their own profile (except `user_type`)
- Claim cards (update their own claimed cards)

## Example: Assigning NFC Tags

1. **As a super_admin, go to `/admin`**
2. **Search or filter for the card code you want to assign**
3. **Click "Assign"** to mark the card as assigned to an NFC tag
4. **Click "Unassign"** if you need to reassign the tag

## Example: Making Multiple Users Admin

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

## Example: Remove Admin Status

```sql
-- Remove admin status (revert to cardholder)
UPDATE profiles
SET user_type = 'cardholder'
WHERE email = 'user-email@example.com';
```

## Security Notes

- Only super_admins can change `user_type` field (enforced by RLS)
- Only super_admins can access `/admin` route
- Super admins have full read/write access to all profiles and cards
- The `user_type` field is protected from being changed by regular users

## Troubleshooting

### "Access Denied" on Admin Page

- Verify your user has `user_type = 'super_admin'` in the profiles table
- Check that you're logged in with the correct account
- Verify the RLS policies have been created correctly

### Can't Update Cards as Admin

- Make sure the "Super admins can update any card" policy exists
- Verify your profile has `user_type = 'super_admin'`
- Check Supabase logs for policy violations

### Admin Link Not Showing

- Clear browser cache and reload
- Verify your profile has `user_type = 'super_admin'`
- Check browser console for errors
