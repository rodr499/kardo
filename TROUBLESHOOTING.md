# Troubleshooting "Database error saving new user"

If you're getting a "Database error saving new user" error when users sign up, here are the steps to fix it:

## Quick Fix

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

## Common Issues

### Issue 1: Handle Uniqueness Conflict
**Symptom**: Error about duplicate handle
**Solution**: The updated trigger function now handles this automatically by appending numbers (e.g., `john`, `john-1`, `john-2`)

### Issue 2: RLS Policy Blocking
**Symptom**: Permission denied error
**Solution**: The trigger function uses `SECURITY DEFINER` which should bypass RLS, but verify:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'profiles';

-- Check policies exist
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Issue 3: Missing Columns
**Symptom**: Column doesn't exist error
**Solution**: Run the SQL setup which adds missing columns safely:
```sql
-- Check if updated_at exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'updated_at';
```

### Issue 4: Trigger Not Firing
**Symptom**: User created but no profile
**Solution**: 
```sql
-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Manual Profile Creation (Temporary Workaround)

If the trigger isn't working, you can manually create profiles for existing users:

```sql
-- For a specific user
INSERT INTO profiles (id, handle, display_name, email)
SELECT 
  id,
  LOWER(SPLIT_PART(email, '@', 1)) || '-' || SUBSTRING(id::TEXT, 1, 8),
  SPLIT_PART(email, '@', 1),
  email
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
LIMIT 1;
```

## Testing

After fixing, test by:
1. Creating a new user account
2. Check if profile was created:
   ```sql
   SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
   ```
3. Check Supabase logs for any errors

## Verify Everything is Working

Run this query to check your setup:

```sql
-- Check trigger exists
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check function exists and is SECURITY DEFINER
SELECT 
  proname, 
  prosecdef as is_security_definer,
  proowner::regrole as owner
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

All should return results indicating the setup is correct.
