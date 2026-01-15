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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    handle: "",
    display_name: "",
    title: "",
    countryCode: "+1",
    phone: "",
    email: "",
    website: "",
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
        .select("*")
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

    setAvatarFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    const supabase = createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUploading(true);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName; // Upload directly to bucket root, not in a subfolder

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, {
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
      setAvatarFile(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    // Persist theme preference to localStorage
    localStorage.setItem("theme", newTheme);
  };

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    const html = document.documentElement;
    html.setAttribute("data-theme", savedTheme);
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-base-200">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Section with Avatar */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="avatar">
                  <div className="rounded-full w-16 h-16 flex items-center justify-center overflow-hidden bg-primary text-primary-content">
                    {avatarPreview || profile?.avatar_url ? (
                      <img
                        src={avatarPreview || profile?.avatar_url || ""}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold">
                        {getInitials(formData.display_name || profile?.display_name || null)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="btn btn-sm btn-outline cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 1 1 0 001-1h6a1 1 0 001 1 2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Change Photo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleAvatarChange}
                    />
                  </label>
                  {avatarFile && (
                    <button
                      onClick={handleAvatarUpload}
                      className="btn btn-sm btn-primary"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <span className="loading loading-spinner"></span>
                          Uploading...
                        </>
                      ) : (
                        "Upload"
                      )}
                    </button>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold">
                    {formData.display_name || profile?.display_name || "My Profile"}
                  </h1>
                  {formData.title && (
                    <p className="text-base-content/70 mt-1">{formData.title}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={toggleTheme}
                  className="btn btn-sm btn-circle btn-ghost"
                  title="Toggle theme"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="m4.93 4.93 1.41 1.41"></path>
                    <path d="m17.66 17.66 1.41 1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="m6.34 17.66-1.41 1.41"></path>
                    <path d="m19.07 4.93-1.41 1.41"></path>
                  </svg>
                </button>
                <button onClick={handleLogout} className="btn btn-sm btn-outline">
                  Logout
                </button>
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

              <div className="divider mt-8"></div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
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
                  <>
                    <a
                      href={`/u/${encodeURIComponent(profile.handle)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
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
                      className="btn btn-outline"
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
                  </>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-6">
              <h2 className="card-title text-2xl">My Cards</h2>
              <Link href="/claim" className="btn btn-sm btn-primary">
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
