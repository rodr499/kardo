-- ============================================
-- Add All RLS Policies to Existing Tables
-- Safe to run on tables with existing data
-- ============================================

-- ============================================
-- STEP 1: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop existing policies (if any) to avoid conflicts
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- Cards policies
DROP POLICY IF EXISTS "Cards are viewable by everyone" ON cards;
DROP POLICY IF EXISTS "Users can claim cards" ON cards;
DROP POLICY IF EXISTS "Super admins can update any card" ON cards;
DROP POLICY IF EXISTS "Super admins can insert cards" ON cards;
DROP POLICY IF EXISTS "Super admins can delete cards" ON cards;

-- Settings policies
DROP POLICY IF EXISTS "Settings are viewable by everyone" ON settings;
DROP POLICY IF EXISTS "Super admins can update settings" ON settings;

-- ============================================
-- STEP 3: Create RLS Policies for profiles table
-- ============================================

-- Anyone can read profiles (for public profile pages)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admins can update any profile
CREATE POLICY "Super admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  );

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================
-- STEP 4: Create RLS Policies for cards table
-- ============================================

-- Anyone can read cards (for card lookup)
CREATE POLICY "Cards are viewable by everyone"
  ON cards FOR SELECT
  USING (true);

-- Only authenticated users can claim cards (update)
CREATE POLICY "Users can claim cards"
  ON cards FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Super admins can update any card (for NFC tag assignment)
CREATE POLICY "Super admins can update any card"
  ON cards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  );

-- Super admins can insert cards (for card generation)
CREATE POLICY "Super admins can insert cards"
  ON cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  );

-- Super admins can delete cards
CREATE POLICY "Super admins can delete cards"
  ON cards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  );

-- ============================================
-- STEP 5: Create RLS Policies for settings table
-- ============================================

-- Anyone can read settings (for checking registration status)
CREATE POLICY "Settings are viewable by everyone"
  ON settings FOR SELECT
  USING (true);

-- Only super admins can update settings
CREATE POLICY "Super admins can update settings"
  ON settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND user_type = 'super_admin'
    )
  );

-- ============================================
-- DONE! All RLS policies have been created.
-- ============================================
