-- ============================================
-- Kardo Database Schema - Complete Recreation
-- WARNING: This will DROP all existing tables and data!
-- Run this to completely recreate the database schema
-- ============================================

-- ============================================
-- STEP 1: Drop existing objects (in correct order)
-- ============================================

-- Drop triggers first (before dropping tables)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop tables with CASCADE (this will automatically drop all policies, indexes, and triggers)
-- Order matters: drop dependent tables first
DROP TABLE IF EXISTS public.cards CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions (after tables are dropped)
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.handle_settings_updated_at();

-- ============================================
-- STEP 2: Create tables
-- ============================================

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  title TEXT,
  phone TEXT,
  country_code TEXT DEFAULT '+1',
  email TEXT,
  website TEXT,
  avatar_url TEXT,
  qr_code_url TEXT,
  show_qr_code BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User management
  user_type TEXT DEFAULT 'cardholder' CHECK (user_type IN ('super_admin', 'cardholder')),
  searchable BOOLEAN DEFAULT FALSE,
  
  -- Primary CTA
  primary_cta_type TEXT DEFAULT 'save_contact' 
    CHECK (primary_cta_type IN ('save_contact', 'book_meeting', 'message_whatsapp', 'visit_website', 'email_me', 'call_me')),
  primary_cta_value TEXT,
  
  -- Social media
  linkedin TEXT,
  twitter TEXT,
  instagram TEXT,
  facebook TEXT,
  tiktok TEXT,
  youtube TEXT,
  github TEXT,
  
  -- Location / Office info
  office_address TEXT,
  office_city TEXT,
  maps_link TEXT,
  
  -- Availability / Contact preference
  best_time_to_contact TEXT,
  preferred_contact_method TEXT,
  
  -- Department / Team
  department TEXT,
  team_name TEXT,
  manager TEXT,
  
  -- Pronouns & Name pronunciation
  pronouns TEXT,
  name_pronunciation TEXT,
  
  -- Bio / About
  bio TEXT,
  
  -- Messaging-first links
  whatsapp TEXT,
  signal TEXT,
  telegram TEXT,
  sms_link TEXT,
  
  -- Calendar scheduling
  calendar_link TEXT,
  timezone TEXT,
  
  -- Media / content
  podcast_link TEXT,
  youtube_channel TEXT,
  sermon_series TEXT,
  featured_talk TEXT,
  
  -- Organization details
  company_name TEXT,
  division TEXT,
  office_phone TEXT,
  work_phone TEXT,
  personal_phone TEXT
);

-- Create cards table
CREATE TABLE public.cards (
  code TEXT PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'claimed', 'disabled', 'active')),
  tenant_id TEXT,
  external_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  nfc_tag_assigned BOOLEAN DEFAULT FALSE
);

-- Create settings table
CREATE TABLE public.settings (
  id TEXT PRIMARY KEY DEFAULT 'app',
  registration_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 3: Create indexes
-- ============================================

CREATE INDEX idx_profiles_handle ON profiles(handle);
CREATE INDEX idx_profiles_user_type ON profiles(user_type);
CREATE INDEX idx_cards_code ON cards(code);
CREATE INDEX idx_cards_profile_id ON cards(profile_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_nfc_tag_assigned ON cards(nfc_tag_assigned);

-- ============================================
-- STEP 4: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 5: RLS Policies for profiles table
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
-- STEP 6: RLS Policies for cards table
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
-- STEP 7: RLS Policies for settings table
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
-- STEP 8: Create functions
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

-- Function to update updated_at timestamp for profiles
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
-- STEP 9: Create triggers
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
-- STEP 10: Insert default data
-- ============================================

-- Insert default settings
INSERT INTO public.settings (id, registration_enabled)
VALUES ('app', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DONE! All tables, policies, functions, and triggers have been created.
-- ============================================
