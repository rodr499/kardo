-- ============================================
-- Kardo Supabase Auth Setup
-- Safe to run on existing tables with data
-- ============================================

-- NOTE: Tables 'profiles' and 'cards' already exist with data
-- This script only adds missing columns, indexes, RLS policies, and triggers
-- It will NOT modify or delete existing data

-- 1. Ensure profiles table has all required columns (add only if missing)
DO $$ 
BEGIN
  -- Add updated_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  
  -- Add country_code if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'country_code') THEN
    ALTER TABLE profiles ADD COLUMN country_code TEXT DEFAULT '+1';
  END IF;
END $$;

-- 2. Ensure cards table has all required columns (add only if missing)
DO $$ 
BEGIN
  -- Add claimed_at if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'cards' AND column_name = 'claimed_at') THEN
    ALTER TABLE cards ADD COLUMN claimed_at TIMESTAMPTZ;
  END IF;
END $$;

-- 3. Create indexes for better performance (safe - won't recreate if exists)
CREATE INDEX IF NOT EXISTS idx_profiles_handle ON profiles(handle);
CREATE INDEX IF NOT EXISTS idx_cards_code ON cards(code);
CREATE INDEX IF NOT EXISTS idx_cards_profile_id ON cards(profile_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);

-- 4. Enable Row Level Security (RLS) - safe to run multiple times
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for profiles table (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Anyone can read profiles (for public profile pages)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow trigger function to insert profiles (SECURITY DEFINER bypasses RLS, but this is a backup)
-- Note: SECURITY DEFINER functions should bypass RLS automatically

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- 6. RLS Policies for cards table (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Cards are viewable by everyone" ON cards;
DROP POLICY IF EXISTS "Users can claim cards" ON cards;

-- Anyone can read cards (for card lookup)
CREATE POLICY "Cards are viewable by everyone"
  ON cards FOR SELECT
  USING (true);

-- Only authenticated users can claim cards (update)
CREATE POLICY "Users can claim cards"
  ON cards FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Function to automatically create profile on user signup
-- This will only insert if profile doesn't already exist (safe for existing users)
-- Handles handle conflicts by appending a random suffix
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_handle TEXT;
  final_handle TEXT;
  handle_exists BOOLEAN;
  counter INTEGER := 0;
BEGIN
  -- Generate base handle from email
  base_handle := COALESCE(
    LOWER(REGEXP_REPLACE(SPLIT_PART(NEW.email, '@', 1), '[^a-z0-9]', '', 'g')),
    'user-' || SUBSTRING(NEW.id::TEXT, 1, 8)
  );
  
  -- Ensure handle is not empty and make it unique if needed
  IF base_handle = '' OR LENGTH(base_handle) < 3 THEN
    base_handle := 'user-' || SUBSTRING(NEW.id::TEXT, 1, 8);
  END IF;
  
  final_handle := base_handle;
  
  -- Check if handle exists and make it unique
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE handle = final_handle) INTO handle_exists;
    EXIT WHEN NOT handle_exists;
    counter := counter + 1;
    final_handle := base_handle || '-' || counter;
    -- Safety check to prevent infinite loop
    IF counter > 1000 THEN
      final_handle := 'user-' || SUBSTRING(NEW.id::TEXT, 1, 12);
      EXIT;
    END IF;
  END LOOP;
  
  -- Insert profile (won't fail if profile already exists due to ON CONFLICT)
  INSERT INTO public.profiles (id, handle, display_name, email)
  VALUES (
    NEW.id,
    final_handle,
    COALESCE(
      INITCAP(SPLIT_PART(NEW.email, '@', 1)),
      'User'
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING; -- Don't overwrite existing profiles
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to create profile when user signs up (safe - won't duplicate)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
