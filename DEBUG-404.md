# Debugging 404 Errors

## Common Causes and Fixes

### 1. RLS Policies Blocking Queries

If RLS is enabled but policies are missing/incorrect, queries will return empty results (causing 404s).

**Check:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('profiles', 'cards');

-- Check if policies exist
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

**Fix:** Run the `supabase-setup.sql` file to ensure all policies are created correctly.

### 2. Handle Case Sensitivity

Handles in the URL might not match database handles due to case sensitivity.

**Fix:** Updated code now uses `.ilike()` for case-insensitive lookups.

**Test:**
- Try accessing `/u/johndoe` vs `/u/JohnDoe` - both should work now
- Check database: `SELECT handle FROM profiles LIMIT 5;`

### 3. Missing Profiles

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

### 4. Database Connection Issues

Supabase client might not be connecting correctly.

**Check:**
- Environment variables are set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Supabase project is active and not paused
- Network connectivity

### 5. Middleware Issues

Middleware might be blocking requests incorrectly.

**Check:** 
- Review middleware matcher patterns
- Check if middleware is throwing errors

**Test:** Try accessing routes directly without going through middleware.

## Quick Diagnostic Queries

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

## Testing Steps

1. **Test Homepage:** `/` - Should work
2. **Test Login:** `/login` - Should work  
3. **Test Profile Creation:** Sign up and check if profile was created
4. **Test Profile Access:** `/u/<handle>` - Should show profile
5. **Test Card Lookup:** `/c/<code>` - Should redirect appropriately

## Enable Debug Logging

Add to your route handlers temporarily:

```typescript
console.log('Query params:', { handle });
console.log('Supabase query result:', { data, error });
```

Check browser console and server logs for errors.
