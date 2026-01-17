-- ============================================
-- Add All RLS Policies, Functions, and Triggers
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
-- STEP 6: Drop existing triggers (if any) to avoid conflicts
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;

-- ============================================
-- STEP 7: Create or replace functions
-- ============================================

-- Function to automatically create profile on user signup
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
  
  -- Insert profile
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

-- Function to update updated_at timestamp (generic, used by multiple tables)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp for settings
CREATE OR REPLACE FUNCTION public.handle_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 8: Create triggers
-- ============================================

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Trigger to auto-update updated_at for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to auto-update updated_at for settings
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_settings_updated_at();

-- Trigger to auto-update updated_at for cards
CREATE TRIGGER update_cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- DONE! All policies, functions, and triggers have been created.
-- ============================================
