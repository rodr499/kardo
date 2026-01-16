"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";

interface Profile {
  id: string;
  handle: string;
  display_name: string | null;
  title: string | null;
  phone: string | null;
  country_code: string | null;
  email: string | null;
  website: string | null;
  avatar_url: string | null;
  qr_code_url: string | null;
  user_type: string | null;
  searchable: boolean | null;
  linkedin: string | null;
  twitter: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  github: string | null;
  // Location / Office info
  office_address: string | null;
  office_city: string | null;
  maps_link: string | null;
  // Availability / Contact preference
  best_time_to_contact: string | null;
  preferred_contact_method: string | null;
  // Department / Team
  department: string | null;
  team_name: string | null;
  manager: string | null;
  // Pronouns & Name pronunciation
  pronouns: string | null;
  name_pronunciation: string | null;
  // Bio / About
  bio: string | null;
  // Messaging-first links
  whatsapp: string | null;
  signal: string | null;
  telegram: string | null;
  sms_link: string | null;
  // Calendar scheduling
  calendar_link: string | null;
  timezone: string | null;
  // Media / content
  podcast_link: string | null;
  youtube_channel: string | null;
  sermon_series: string | null;
  featured_talk: string | null;
  // Organization details
  company_name: string | null;
  division: string | null;
  office_phone: string | null;
  work_phone: string | null;
  personal_phone: string | null;
  // Primary CTA
  primary_cta_type: string | null;
  primary_cta_value: string | null;
}

interface Card {
  code: string;
  status: string;
  created_at: string;
  claimed_at: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    handle: "",
    display_name: "",
    title: "",
    countryCode: "+1",
    phone: "",
    email: "",
    website: "",
    searchable: false,
    linkedin: "",
    twitter: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
    github: "",
    // Location / Office info
    office_address: "",
    office_city: "",
    maps_link: "",
    // Availability / Contact preference
    best_time_to_contact: "",
    preferred_contact_method: "",
    // Department / Team
    department: "",
    team_name: "",
    manager: "",
    // Pronouns & Name pronunciation
    pronouns: "",
    name_pronunciation: "",
    // Bio / About
    bio: "",
    // Messaging-first links
    whatsapp: "",
    signal: "",
    telegram: "",
    sms_link: "",
    // Calendar scheduling
    calendar_link: "",
    timezone: "",
    // Media / content
    podcast_link: "",
    youtube_channel: "",
    sermon_series: "",
    featured_talk: "",
    // Organization details
    company_name: "",
    division: "",
    office_phone: "",
    work_phone: "",
    personal_phone: "",
    // Primary CTA
    primary_cta_type: "save_contact",
    primary_cta_value: "",
  });

  // Common country codes
  const countryCodes = [
    { code: "+1", country: "US/CA" },
    { code: "+44", country: "UK" },
    { code: "+33", country: "FR" },
    { code: "+49", country: "DE" },
    { code: "+39", country: "IT" },
    { code: "+34", country: "ES" },
    { code: "+31", country: "NL" },
    { code: "+32", country: "BE" },
    { code: "+41", country: "CH" },
    { code: "+43", country: "AT" },
    { code: "+45", country: "DK" },
    { code: "+46", country: "SE" },
    { code: "+47", country: "NO" },
    { code: "+351", country: "PT" },
    { code: "+353", country: "IE" },
    { code: "+358", country: "FI" },
    { code: "+61", country: "AU" },
    { code: "+64", country: "NZ" },
    { code: "+81", country: "JP" },
    { code: "+82", country: "KR" },
    { code: "+86", country: "CN" },
    { code: "+91", country: "IN" },
    { code: "+55", country: "BR" },
    { code: "+52", country: "MX" },
    { code: "+54", country: "AR" },
    { code: "+27", country: "ZA" },
  ];

  // Common timezones
  const timezones = [
    { value: "", label: "Select timezone" },
    { value: "America/New_York", label: "Eastern Time (US & Canada)" },
    { value: "America/Chicago", label: "Central Time (US & Canada)" },
    { value: "America/Denver", label: "Mountain Time (US & Canada)" },
    { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
    { value: "America/Phoenix", label: "Arizona" },
    { value: "America/Anchorage", label: "Alaska" },
    { value: "Pacific/Honolulu", label: "Hawaii" },
    { value: "America/Toronto", label: "Toronto" },
    { value: "America/Vancouver", label: "Vancouver" },
    { value: "America/Mexico_City", label: "Mexico City" },
    { value: "America/Sao_Paulo", label: "São Paulo" },
    { value: "America/Buenos_Aires", label: "Buenos Aires" },
    { value: "Europe/London", label: "London" },
    { value: "Europe/Paris", label: "Paris" },
    { value: "Europe/Berlin", label: "Berlin" },
    { value: "Europe/Rome", label: "Rome" },
    { value: "Europe/Madrid", label: "Madrid" },
    { value: "Europe/Amsterdam", label: "Amsterdam" },
    { value: "Europe/Brussels", label: "Brussels" },
    { value: "Europe/Zurich", label: "Zurich" },
    { value: "Europe/Vienna", label: "Vienna" },
    { value: "Europe/Stockholm", label: "Stockholm" },
    { value: "Europe/Oslo", label: "Oslo" },
    { value: "Europe/Copenhagen", label: "Copenhagen" },
    { value: "Europe/Helsinki", label: "Helsinki" },
    { value: "Europe/Dublin", label: "Dublin" },
    { value: "Europe/Lisbon", label: "Lisbon" },
    { value: "Europe/Warsaw", label: "Warsaw" },
    { value: "Europe/Prague", label: "Prague" },
    { value: "Europe/Budapest", label: "Budapest" },
    { value: "Europe/Athens", label: "Athens" },
    { value: "Europe/Istanbul", label: "Istanbul" },
    { value: "Europe/Moscow", label: "Moscow" },
    { value: "Asia/Dubai", label: "Dubai" },
    { value: "Asia/Kolkata", label: "Mumbai, New Delhi" },
    { value: "Asia/Dhaka", label: "Dhaka" },
    { value: "Asia/Bangkok", label: "Bangkok" },
    { value: "Asia/Singapore", label: "Singapore" },
    { value: "Asia/Hong_Kong", label: "Hong Kong" },
    { value: "Asia/Shanghai", label: "Shanghai" },
    { value: "Asia/Tokyo", label: "Tokyo" },
    { value: "Asia/Seoul", label: "Seoul" },
    { value: "Australia/Sydney", label: "Sydney" },
    { value: "Australia/Melbourne", label: "Melbourne" },
    { value: "Australia/Brisbane", label: "Brisbane" },
    { value: "Australia/Perth", label: "Perth" },
    { value: "Pacific/Auckland", label: "Auckland" },
    { value: "Africa/Johannesburg", label: "Johannesburg" },
    { value: "Africa/Cairo", label: "Cairo" },
    { value: "Africa/Lagos", label: "Lagos" },
    { value: "America/Lima", label: "Lima" },
    { value: "America/Bogota", label: "Bogota" },
    { value: "America/Santiago", label: "Santiago" },
    { value: "America/Caracas", label: "Caracas" },
  ];

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/profile");
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*,qr_code_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError("Failed to load profile");
        setLoading(false);
        return;
      }

      if (profileData) {
        // Use country_code from database, or parse from phone if country_code doesn't exist yet
        let countryCode = profileData.country_code || "+1";
        let phoneNumber = profileData.phone || "";

        // If country_code is not set but phone starts with +, parse it (migration path)
        if (!profileData.country_code && phoneNumber && phoneNumber.startsWith("+")) {
          const match = phoneNumber.match(/^(\+\d{1,3})/);
          if (match) {
            countryCode = match[1];
            phoneNumber = phoneNumber.substring(match[1].length).trim();
          }
        }

        setProfile(profileData);
        setFormData({
          handle: profileData.handle || "",
          display_name: profileData.display_name || "",
          title: profileData.title || "",
          countryCode: countryCode,
          phone: phoneNumber,
          email: profileData.email || "",
          website: profileData.website || "",
          searchable: profileData.searchable ?? false,
          linkedin: profileData.linkedin || "",
          twitter: profileData.twitter || "",
          instagram: profileData.instagram || "",
          facebook: profileData.facebook || "",
          tiktok: profileData.tiktok || "",
          youtube: profileData.youtube || "",
          github: profileData.github || "",
          // Location / Office info
          office_address: profileData.office_address || "",
          office_city: profileData.office_city || "",
          maps_link: profileData.maps_link || "",
          // Availability / Contact preference
          best_time_to_contact: profileData.best_time_to_contact || "",
          preferred_contact_method: profileData.preferred_contact_method || "",
          // Department / Team
          department: profileData.department || "",
          team_name: profileData.team_name || "",
          manager: profileData.manager || "",
          // Pronouns & Name pronunciation
          pronouns: profileData.pronouns || "",
          name_pronunciation: profileData.name_pronunciation || "",
          // Bio / About
          bio: profileData.bio || "",
          // Messaging-first links
          whatsapp: profileData.whatsapp || "",
          signal: profileData.signal || "",
          telegram: profileData.telegram || "",
          sms_link: profileData.sms_link || "",
          // Calendar scheduling
          calendar_link: profileData.calendar_link || "",
          timezone: profileData.timezone || "",
          // Media / content
          podcast_link: profileData.podcast_link || "",
          youtube_channel: profileData.youtube_channel || "",
          sermon_series: profileData.sermon_series || "",
          featured_talk: profileData.featured_talk || "",
          // Organization details
          company_name: profileData.company_name || "",
          division: profileData.division || "",
          office_phone: profileData.office_phone || "",
          work_phone: profileData.work_phone || "",
          personal_phone: profileData.personal_phone || "",
          // Primary CTA
          primary_cta_type: profileData.primary_cta_type || "save_contact",
          primary_cta_value: profileData.primary_cta_value || "",
        });

        // Set avatar preview if avatar_url exists
        if (profileData.avatar_url) {
          setAvatarPreview(profileData.avatar_url);
        }
      } else {
        // Create profile if it doesn't exist
        const email = user.email || "";
        const defaultHandle = email.split("@")[0] || `user-${user.id.slice(0, 8)}`;
        setFormData({
          handle: defaultHandle,
          display_name: defaultHandle,
          title: "",
          countryCode: "+1",
          phone: "",
          email: email,
          website: "",
          searchable: false,
          linkedin: "",
          twitter: "",
          instagram: "",
          facebook: "",
          tiktok: "",
          youtube: "",
          github: "",
          // Location / Office info
          office_address: "",
          office_city: "",
          maps_link: "",
          // Availability / Contact preference
          best_time_to_contact: "",
          preferred_contact_method: "",
          // Department / Team
          department: "",
          team_name: "",
          manager: "",
          // Pronouns & Name pronunciation
          pronouns: "",
          name_pronunciation: "",
          // Bio / About
          bio: "",
          // Messaging-first links
          whatsapp: "",
          signal: "",
          telegram: "",
          sms_link: "",
          // Calendar scheduling
          calendar_link: "",
          timezone: "",
          // Media / content
          podcast_link: "",
          youtube_channel: "",
          sermon_series: "",
          featured_talk: "",
          // Organization details
          company_name: "",
          division: "",
          office_phone: "",
          work_phone: "",
          personal_phone: "",
          // Primary CTA
          primary_cta_type: "save_contact",
          primary_cta_value: "",
        });
      }

      // Load user's cards
      const { data: cardsData, error: cardsError } = await supabase
        .from("cards")
        .select("code,status,created_at,claimed_at")
        .eq("profile_id", user.id)
        .order("claimed_at", { ascending: false, nullsFirst: false });

      if (cardsError) {
        console.error("Error loading cards:", cardsError);
      } else {
        setCards(cardsData || []);
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // Check if handle is taken by another user
      if (formData.handle !== profile?.handle) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("handle", formData.handle)
          .neq("id", user.id)
          .maybeSingle();

        if (existing) {
          setError("This handle is already taken. Please choose another.");
          setSaving(false);
          return;
        }
      }

      // Store phone number without country code (country code stored separately)
      const phoneNumber = formData.phone.trim() || null;

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          handle: formData.handle.trim(),
          display_name: formData.display_name.trim() || null,
          title: formData.title.trim() || null,
          phone: phoneNumber,
          country_code: formData.countryCode || "+1",
          email: formData.email.trim() || null,
          website: formData.website.trim() || null,
          searchable: formData.searchable ?? false,
          linkedin: formData.linkedin.trim() || null,
          twitter: formData.twitter.trim() || null,
          instagram: formData.instagram.trim() || null,
          facebook: formData.facebook.trim() || null,
          tiktok: formData.tiktok.trim() || null,
          youtube: formData.youtube.trim() || null,
          github: formData.github.trim() || null,
          // Location / Office info
          office_address: formData.office_address.trim() || null,
          office_city: formData.office_city.trim() || null,
          maps_link: formData.maps_link.trim() || null,
          // Availability / Contact preference
          best_time_to_contact: formData.best_time_to_contact.trim() || null,
          preferred_contact_method: formData.preferred_contact_method.trim() || null,
          // Department / Team
          department: formData.department.trim() || null,
          team_name: formData.team_name.trim() || null,
          manager: formData.manager.trim() || null,
          // Pronouns & Name pronunciation
          pronouns: formData.pronouns.trim() || null,
          name_pronunciation: formData.name_pronunciation.trim() || null,
          // Bio / About
          bio: formData.bio.trim() || null,
          // Messaging-first links
          whatsapp: formData.whatsapp.trim() || null,
          signal: formData.signal.trim() || null,
          telegram: formData.telegram.trim() || null,
          sms_link: formData.sms_link.trim() || null,
          // Calendar scheduling
          calendar_link: formData.calendar_link.trim() || null,
          timezone: formData.timezone.trim() || null,
          // Media / content
          podcast_link: formData.podcast_link.trim() || null,
          youtube_channel: formData.youtube_channel.trim() || null,
          sermon_series: formData.sermon_series.trim() || null,
          featured_talk: formData.featured_talk.trim() || null,
          // Organization details
          company_name: formData.company_name.trim() || null,
          division: formData.division.trim() || null,
          office_phone: formData.office_phone.trim() || null,
          work_phone: formData.work_phone.trim() || null,
          personal_phone: formData.personal_phone.trim() || null,
          // Primary CTA
          primary_cta_type: formData.primary_cta_type || "save_contact",
          primary_cta_value: formData.primary_cta_value.trim() || null,
        });

      if (updateError) throw updateError;

      setSuccess(true);
      setProfile({
        id: user.id,
        handle: formData.handle.trim(),
        display_name: formData.display_name.trim() || null,
        title: formData.title.trim() || null,
        phone: phoneNumber,
        country_code: formData.countryCode || "+1",
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        avatar_url: profile?.avatar_url || null,
        qr_code_url: profile?.qr_code_url || null,
        user_type: profile?.user_type || null,
        searchable: formData.searchable ?? false,
        linkedin: formData.linkedin.trim() || null,
        twitter: formData.twitter.trim() || null,
        instagram: formData.instagram.trim() || null,
        facebook: formData.facebook.trim() || null,
        tiktok: formData.tiktok.trim() || null,
        youtube: formData.youtube.trim() || null,
        github: formData.github.trim() || null,
        // Location / Office info
        office_address: formData.office_address.trim() || null,
        office_city: formData.office_city.trim() || null,
        maps_link: formData.maps_link.trim() || null,
        // Availability / Contact preference
        best_time_to_contact: formData.best_time_to_contact.trim() || null,
        preferred_contact_method: formData.preferred_contact_method.trim() || null,
        // Department / Team
        department: formData.department.trim() || null,
        team_name: formData.team_name.trim() || null,
        manager: formData.manager.trim() || null,
        // Pronouns & Name pronunciation
        pronouns: formData.pronouns.trim() || null,
        name_pronunciation: formData.name_pronunciation.trim() || null,
        // Bio / About
        bio: formData.bio.trim() || null,
        // Messaging-first links
        whatsapp: formData.whatsapp.trim() || null,
        signal: formData.signal.trim() || null,
        telegram: formData.telegram.trim() || null,
        sms_link: formData.sms_link.trim() || null,
        // Calendar scheduling
        calendar_link: formData.calendar_link.trim() || null,
        timezone: formData.timezone.trim() || null,
        // Media / content
        podcast_link: formData.podcast_link.trim() || null,
        youtube_channel: formData.youtube_channel.trim() || null,
        sermon_series: formData.sermon_series.trim() || null,
        featured_talk: formData.featured_talk.trim() || null,
        // Organization details
        company_name: formData.company_name.trim() || null,
        division: formData.division.trim() || null,
        office_phone: formData.office_phone.trim() || null,
        work_phone: formData.work_phone.trim() || null,
        personal_phone: formData.personal_phone.trim() || null,
        // Primary CTA
        primary_cta_type: formData.primary_cta_type || "save_contact",
        primary_cta_value: formData.primary_cta_value.trim() || null,
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleShare = async (handleOrCode: string, isCard: boolean = false) => {
    const url = isCard
      ? `${window.location.origin}/c/${encodeURIComponent(handleOrCode)}`
      : `${window.location.origin}/u/${encodeURIComponent(handleOrCode)}`;

    // Try Web Share API first (if available)
    if (navigator.share) {
      try {
        await navigator.share({
          title: isCard ? "My Kardo Card" : "My Kardo Profile",
          text: "Check out my digital business card",
          url: url,
        });
        return; // Successfully shared, exit
      } catch (err: any) {
        // User cancelled (AbortError) - don't show error
        if (err.name === "AbortError") {
          return;
        }
        // Other errors fall through to clipboard fallback
      }
    }

    // Fallback to clipboard
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMessage("Link copied to clipboard!");
        setTimeout(() => setShareMessage(null), 3000);
      } else {
        // Fallback for older browsers - use textarea method
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.left = "-999999px";
        textarea.style.top = "-999999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();

        try {
          const successful = document.execCommand("copy");
          document.body.removeChild(textarea);

          if (successful) {
            setShareMessage("Link copied to clipboard!");
            setTimeout(() => setShareMessage(null), 3000);
          } else {
            throw new Error("Copy command failed");
          }
        } catch (err) {
          document.body.removeChild(textarea);
          throw err;
        }
      }
    } catch (err) {
      // Show error and also show the URL so user can manually copy
      setError(`Failed to copy link. Please copy manually: ${url}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    // Create preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-upload immediately
    const supabase = createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Upload directly to bucket root, not in a subfolder

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      // Delete old avatar if it exists
      if (profile?.avatar_url) {
        // Extract filename from URL (handle both full URLs and relative paths)
        const urlParts = profile.avatar_url.split("/");
        const oldFileName = urlParts[urlParts.length - 1];
        if (oldFileName) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile({
        ...profile!,
        avatar_url: publicUrl,
      });
      setAvatarPreview(null); // Clear preview since we have the real URL now
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to upload avatar");
      setAvatarPreview(null); // Clear preview on error
    } finally {
      setUploading(false);
    }

    // Reset file input
    e.target.value = "";
  };

  // Load theme preference on mount and set page title
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    const html = document.documentElement;
    html.setAttribute("data-theme", savedTheme);
    document.title = "My Profile - Kardo";
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-3 sm:p-6 bg-base-200">
      <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Section with Avatar */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="avatar self-center sm:self-auto relative">
                  <div className="rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center overflow-hidden bg-primary text-primary-content">
                    {avatarPreview || profile?.avatar_url ? (
                      <img
                        src={avatarPreview || profile?.avatar_url || ""}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl sm:text-3xl font-bold">
                        {getInitials(formData.display_name || profile?.display_name || null)}
                      </span>
                    )}
                  </div>
                  {/* Camera icon overlay on bottom right */}
                  <label className="absolute bottom-0 right-0 bg-primary text-primary-content rounded-full p-1.5 sm:p-2 cursor-pointer hover:bg-primary-focus transition-colors shadow-lg border-2 border-base-100">
                    {uploading ? (
                      <span className="loading loading-spinner loading-xs"></span>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 sm:h-4 sm:w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      disabled={uploading}
                    />
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold">
                      {formData.display_name || profile?.display_name || "My Profile"}
                    </h1>
                    {formData.title && (
                      <p className="text-sm sm:text-base text-base-content/70 mt-1">{formData.title}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success mb-4">
                <span>Profile saved successfully!</span>
              </div>
            )}

            {shareMessage && (
              <div className="alert alert-info mb-4">
                <span>{shareMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="tabs tabs-lifted">
                {/* Basic Info Tab */}
                <label className="tab">
                  <input type="radio" name="profile_tabs" defaultChecked />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Basic Info
                </label>
                <div className="tab-content bg-base-100 border-base-300 p-6 space-y-6">
                  <div className="divider">Profile Information</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Handle (URL)</span>
                        </label>
                        <div className="flex-1">
                          <div className="input-group">
                            <span>getkardo.app/u/</span>
                            <input
                              type="text"
                              className="input input-bordered flex-1 font-mono"
                              value={formData.handle}
                              onChange={(e) =>
                                setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })
                              }
                              required
                              pattern="[a-z0-9-]+"
                              title="Only lowercase letters, numbers, and hyphens"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="label">
                      Your profile will be at:{" "}
                      <Link
                        href={`/u/${formData.handle}`}
                        target="_blank"
                        className="link"
                      >
                        /u/{formData.handle}
                      </Link>
                    </p>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Display Name</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.display_name}
                          onChange={(e) =>
                            setFormData({ ...formData, display_name: e.target.value })
                          }
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Title</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.title}
                          onChange={(e) =>
                            setFormData({ ...formData, title: e.target.value })
                          }
                          placeholder="Software Engineer"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <div className="divider mt-6">Contact Information</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Phone</span>
                        </label>
                        <div className="flex flex-1 gap-2">
                          <select
                            className="select select-bordered w-32"
                            value={formData.countryCode}
                            onChange={(e) =>
                              setFormData({ ...formData, countryCode: e.target.value })
                            }
                          >
                            {countryCodes.map((cc) => (
                              <option key={cc.code} value={cc.code}>
                                {cc.code} {cc.country}
                              </option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            className="input input-bordered flex-1"
                            value={formData.phone}
                            onChange={(e) =>
                              setFormData({ ...formData, phone: e.target.value })
                            }
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Email</span>
                        </label>
                        <input
                          type="email"
                          className="input input-bordered flex-1"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Website</span>
                        </label>
                        <input
                          type="url"
                          className="input input-bordered flex-1"
                          value={formData.website}
                          onChange={(e) =>
                            setFormData({ ...formData, website: e.target.value })
                          }
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <div className="divider mt-6">Primary Action Button</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Button Type</span>
                        </label>
                        <select
                          className="select select-bordered flex-1"
                          value={formData.primary_cta_type}
                          onChange={(e) =>
                            setFormData({ ...formData, primary_cta_type: e.target.value, primary_cta_value: "" })
                          }
                        >
                          <option value="save_contact">Add to Contacts</option>
                          <option value="book_meeting">Book a Meeting</option>
                          <option value="message_whatsapp">Message on WhatsApp</option>
                          <option value="visit_website">Visit Website</option>
                          <option value="email_me">Email Me</option>
                          <option value="call_me">Call Me</option>
                        </select>
                      </div>
                      <p className="label text-sm text-base-content/70 mt-2">
                        This is the main button visitors see on your public profile page.
                      </p>
                    </div>
                  </fieldset>

                  {/* Conditional input for CTA value */}
                  {(formData.primary_cta_type === "book_meeting" ||
                    formData.primary_cta_type === "message_whatsapp" ||
                    formData.primary_cta_type === "visit_website") && (
                    <fieldset className="fieldset">
                      <div className="form-control">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <label className="label sm:w-32">
                            <span className="label-text font-semibold">
                              {formData.primary_cta_type === "book_meeting"
                                ? "Booking URL"
                                : formData.primary_cta_type === "message_whatsapp"
                                ? "Phone/URL (Optional)"
                                : "Website URL (Optional)"}
                            </span>
                          </label>
                          <div className="flex-1">
                            <input
                              type={formData.primary_cta_type === "message_whatsapp" ? "text" : "url"}
                              className="input input-bordered flex-1"
                              value={formData.primary_cta_value}
                              onChange={(e) =>
                                setFormData({ ...formData, primary_cta_value: e.target.value })
                              }
                              placeholder={
                                formData.primary_cta_type === "book_meeting"
                                  ? "https://calendly.com/your-name"
                                  : formData.primary_cta_type === "message_whatsapp"
                                  ? "1234567890 or https://wa.me/1234567890"
                                  : "https://example.com"
                              }
                            />
                            <p className="label text-xs text-base-content/60 mt-1">
                              {formData.primary_cta_type === "book_meeting" && (
                                <>If empty, will use your "Calendar Link" or "Website" field.</>
                              )}
                              {formData.primary_cta_type === "message_whatsapp" && (
                                <>If empty, will use your profile phone number.</>
                              )}
                              {formData.primary_cta_type === "visit_website" && (
                                <>If empty, will use your "Website" field.</>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </fieldset>
                  )}
                </div>

                {/* Social & Links Tab */}
                <label className="tab">
                  <input type="radio" name="profile_tabs" />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                  Social & Links
                </label>
                <div className="tab-content bg-base-100 border-base-300 p-6 space-y-6">
                  <div className="divider">Social Media</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">LinkedIn</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.linkedin}
                          onChange={(e) =>
                            setFormData({ ...formData, linkedin: e.target.value })
                          }
                          placeholder="linkedin.com/in/username"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Twitter/X</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.twitter}
                          onChange={(e) =>
                            setFormData({ ...formData, twitter: e.target.value })
                          }
                          placeholder="twitter.com/username or x.com/username"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Instagram</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.instagram}
                          onChange={(e) =>
                            setFormData({ ...formData, instagram: e.target.value })
                          }
                          placeholder="instagram.com/username"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Facebook</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.facebook}
                          onChange={(e) =>
                            setFormData({ ...formData, facebook: e.target.value })
                          }
                          placeholder="facebook.com/username"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">TikTok</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.tiktok}
                          onChange={(e) =>
                            setFormData({ ...formData, tiktok: e.target.value })
                          }
                          placeholder="tiktok.com/@username"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">YouTube</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.youtube}
                          onChange={(e) =>
                            setFormData({ ...formData, youtube: e.target.value })
                          }
                          placeholder="youtube.com/@username or youtube.com/c/channel"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">GitHub</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.github}
                          onChange={(e) =>
                            setFormData({ ...formData, github: e.target.value })
                          }
                          placeholder="github.com/username"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <div className="divider mt-6">💬 Messaging Links</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">WhatsApp</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.whatsapp}
                          onChange={(e) =>
                            setFormData({ ...formData, whatsapp: e.target.value })
                          }
                          placeholder="https://wa.me/1234567890"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Signal</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.signal}
                          onChange={(e) =>
                            setFormData({ ...formData, signal: e.target.value })
                          }
                          placeholder="Signal username or link"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Telegram</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.telegram}
                          onChange={(e) =>
                            setFormData({ ...formData, telegram: e.target.value })
                          }
                          placeholder="https://t.me/username"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">SMS Link</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.sms_link}
                          onChange={(e) =>
                            setFormData({ ...formData, sms_link: e.target.value })
                          }
                          placeholder="sms:+1234567890"
                        />
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Work & Organization Tab */}
                <label className="tab">
                  <input type="radio" name="profile_tabs" />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .414-.336.75-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.25m0 0h4.125c.621 0 1.125-.504 1.125-1.125V11.25c0-4.556-4.03-8.25-9-8.25a9.764 9.764 0 0 0-2.555.161A5.972 5.972 0 0 0 6 6v.75m0 0v3m0-3v3m0 0v3m0-3h3m-3 0H3m8.25-4.5v3m0 0v3m0-3h3m-3 0H9m-.75 0H4.875c-.621 0-1.125.504-1.125 1.125v4.5c0 .621.504 1.125 1.125 1.125H9" />
                  </svg>
                  Work & Organization
                </label>
                <div className="tab-content bg-base-100 border-base-300 p-6 space-y-6">
                  <div className="divider">📍 Location / Office</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Office Address</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.office_address}
                          onChange={(e) =>
                            setFormData({ ...formData, office_address: e.target.value })
                          }
                          placeholder="123 Main St, Suite 100"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">City/Region</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.office_city}
                          onChange={(e) =>
                            setFormData({ ...formData, office_city: e.target.value })
                          }
                          placeholder="New York, NY"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Maps Link</span>
                        </label>
                        <input
                          type="url"
                          className="input input-bordered flex-1"
                          value={formData.maps_link}
                          onChange={(e) =>
                            setFormData({ ...formData, maps_link: e.target.value })
                          }
                          placeholder="https://maps.google.com/..."
                        />
                      </div>
                    </div>
                    <p className="label text-sm text-base-content/70 mt-2">
                      Google Maps or Apple Maps deep link for directions
                    </p>
                  </fieldset>

                  <div className="divider mt-6">🕒 Availability / Contact Preference</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Best Time to Contact</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.best_time_to_contact}
                          onChange={(e) =>
                            setFormData({ ...formData, best_time_to_contact: e.target.value })
                          }
                          placeholder="Weekdays 9am-5pm EST"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Preferred Method</span>
                        </label>
                        <select
                          className="select select-bordered flex-1"
                          value={formData.preferred_contact_method}
                          onChange={(e) =>
                            setFormData({ ...formData, preferred_contact_method: e.target.value })
                          }
                        >
                          <option value="">Select preferred method</option>
                          <option value="call">Call</option>
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="whatsapp">WhatsApp</option>
                        </select>
                      </div>
                    </div>
                  </fieldset>

                  <div className="divider mt-6">🧑‍💼 Department / Team</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Department</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.department}
                          onChange={(e) =>
                            setFormData({ ...formData, department: e.target.value })
                          }
                          placeholder="Engineering"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Team Name</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.team_name}
                          onChange={(e) =>
                            setFormData({ ...formData, team_name: e.target.value })
                          }
                          placeholder="Frontend Team"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Manager (Optional)</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.manager}
                          onChange={(e) =>
                            setFormData({ ...formData, manager: e.target.value })
                          }
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <div className="divider mt-6">📆 Calendar Scheduling</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Calendar Link</span>
                        </label>
                        <input
                          type="url"
                          className="input input-bordered flex-1"
                          value={formData.calendar_link}
                          onChange={(e) =>
                            setFormData({ ...formData, calendar_link: e.target.value })
                          }
                          placeholder="https://calendly.com/username"
                        />
                      </div>
                    </div>
                    <p className="label text-sm text-base-content/70 mt-2">
                      Calendly, Google Calendar, or other scheduling link
                    </p>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Timezone</span>
                        </label>
                        <select
                          className="select select-bordered flex-1"
                          value={formData.timezone}
                          onChange={(e) =>
                            setFormData({ ...formData, timezone: e.target.value })
                          }
                        >
                          {timezones.map((tz) => (
                            <option key={tz.value} value={tz.value}>
                              {tz.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </fieldset>

                  <div className="divider mt-6">🏢 Organization Details</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Company Name</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.company_name}
                          onChange={(e) =>
                            setFormData({ ...formData, company_name: e.target.value })
                          }
                          placeholder="Acme Inc."
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Division</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.division}
                          onChange={(e) =>
                            setFormData({ ...formData, division: e.target.value })
                          }
                          placeholder="Technology Division"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Office Phone</span>
                        </label>
                        <input
                          type="tel"
                          className="input input-bordered flex-1"
                          value={formData.office_phone}
                          onChange={(e) =>
                            setFormData({ ...formData, office_phone: e.target.value })
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Work Phone</span>
                        </label>
                        <input
                          type="tel"
                          className="input input-bordered flex-1"
                          value={formData.work_phone}
                          onChange={(e) =>
                            setFormData({ ...formData, work_phone: e.target.value })
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Personal Phone</span>
                        </label>
                        <input
                          type="tel"
                          className="input input-bordered flex-1"
                          value={formData.personal_phone}
                          onChange={(e) =>
                            setFormData({ ...formData, personal_phone: e.target.value })
                          }
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </fieldset>
                </div>

                {/* Personal Tab */}
                <label className="tab">
                  <input type="radio" name="profile_tabs" />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                  Personal
                </label>
                <div className="tab-content bg-base-100 border-base-300 p-6 space-y-6">
                  <div className="divider">🧾 Pronouns & Name Pronunciation</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Pronouns (Optional)</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.pronouns}
                          onChange={(e) =>
                            setFormData({ ...formData, pronouns: e.target.value })
                          }
                          placeholder="he/him, she/her, they/them"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Name Pronunciation</span>
                        </label>
                        <input
                          type="text"
                          className="input input-bordered flex-1"
                          value={formData.name_pronunciation}
                          onChange={(e) =>
                            setFormData({ ...formData, name_pronunciation: e.target.value })
                          }
                          placeholder="Phonetic spelling or audio link"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <div className="divider mt-6">🧠 Bio / About</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Bio</span>
                        </label>
                        <textarea
                          className="textarea textarea-bordered flex-1"
                          value={formData.bio}
                          onChange={(e) =>
                            setFormData({ ...formData, bio: e.target.value })
                          }
                          placeholder="1-3 sentence introduction about yourself"
                          rows={3}
                        />
                      </div>
                    </div>
                    <p className="label text-sm text-base-content/70 mt-2">
                      A short bio helps distinguish people with similar roles
                    </p>
                  </fieldset>
                </div>

                {/* Media & Content Tab */}
                <label className="tab">
                  <input type="radio" name="profile_tabs" />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 me-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
                  </svg>
                  Media & Content
                </label>
                <div className="tab-content bg-base-100 border-base-300 p-6 space-y-6">
                  <div className="divider">🎧 Media / Content</div>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Podcast Link</span>
                        </label>
                        <input
                          type="url"
                          className="input input-bordered flex-1"
                          value={formData.podcast_link}
                          onChange={(e) =>
                            setFormData({ ...formData, podcast_link: e.target.value })
                          }
                          placeholder="https://podcast.example.com"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">YouTube Channel</span>
                        </label>
                        <input
                          type="url"
                          className="input input-bordered flex-1"
                          value={formData.youtube_channel}
                          onChange={(e) =>
                            setFormData({ ...formData, youtube_channel: e.target.value })
                          }
                          placeholder="https://youtube.com/@channel"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Sermon Series</span>
                        </label>
                        <input
                          type="url"
                          className="input input-bordered flex-1"
                          value={formData.sermon_series}
                          onChange={(e) =>
                            setFormData({ ...formData, sermon_series: e.target.value })
                          }
                          placeholder="Link to sermon series"
                        />
                      </div>
                    </div>
                  </fieldset>

                  <fieldset className="fieldset">
                    <div className="form-control">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <label className="label sm:w-32">
                          <span className="label-text font-semibold">Featured Talk</span>
                        </label>
                        <input
                          type="url"
                          className="input input-bordered flex-1"
                          value={formData.featured_talk}
                          onChange={(e) =>
                            setFormData({ ...formData, featured_talk: e.target.value })
                          }
                          placeholder="Link to featured presentation or talk"
                        />
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>

              <div className="divider mt-8"></div>

              <div className="flex flex-col gap-3 mt-6">
                <button
                  type="submit"
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="loading loading-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
                      </svg>
                      Save Profile
                    </>
                  )}
                </button>
                {profile && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href={`/u/${encodeURIComponent(profile.handle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline flex-1 sm:flex-none"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      View Profile
                    </a>
                    <button
                      onClick={() => handleShare(profile.handle, false)}
                      className="btn btn-outline flex-1 sm:flex-none"
                      type="button"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                      Share
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="card-title text-xl sm:text-2xl">My Cards</h2>
              <Link href="/claim" className="btn btn-sm btn-primary w-full sm:w-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Claim a Card
              </Link>
            </div>

            {cards.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎴</div>
                <p className="text-base opacity-70 mb-6">
                  You haven't claimed any cards yet.
                </p>
                <Link href="/claim" className="btn btn-primary">
                  Claim Your First Card
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {cards.map((card) => (
                  <div key={card.code} className="border border-base-300 rounded-lg p-5 hover:shadow-md transition-shadow">
                    <div className="font-mono font-bold text-lg mb-1">
                      {card.code}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-base-content/70">
                      <span className={`badge ${card.status === "active" ? "badge-success" : card.status === "disabled" ? "badge-error" : "badge-warning"}`}>
                        {card.status}
                      </span>
                      {card.claimed_at && (
                        <span>Claimed {new Date(card.claimed_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
