-- ============================================
-- Add All Functions and Triggers to Existing Tables
-- Safe to run on tables with existing data
-- ============================================

-- ============================================
-- STEP 1: Drop existing triggers (if any) to avoid conflicts
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
DROP TRIGGER IF EXISTS update_cards_updated_at ON cards;

-- ============================================
-- STEP 2: Create or replace functions
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
-- STEP 3: Create triggers
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
-- DONE! All functions and triggers have been created.
-- ============================================
