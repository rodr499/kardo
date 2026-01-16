"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";
import QRCode from "qrcode";

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
  const [uploadingQR, setUploadingQR] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
        });

        // Set avatar preview if avatar_url exists
        if (profileData.avatar_url) {
          setAvatarPreview(profileData.avatar_url);
        }
        // Set QR code preview if qr_code_url exists
        if (profileData.qr_code_url) {
          setQrCodePreview(profileData.qr_code_url);
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

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeletePasswordError("Please enter your password to confirm");
      return;
    }

    setDeleting(true);
    setDeletePasswordError(null);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error("User not found");
      }

      // Verify password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: deletePassword,
      });

      if (authError) {
        setDeletePasswordError("Incorrect password");
        setDeleting(false);
        return;
      }

      // Password verified, proceed with deletion
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete account");
      }

      // Account deleted successfully, redirect to home
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setDeletePasswordError(err.message || "Failed to delete account");
      setDeleting(false);
    }
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

  const handleQRCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setQrCodePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Auto-upload immediately
    const supabase = createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    setUploadingQR(true);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `qr-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

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

      // Delete old QR code if it exists
      if (profile?.qr_code_url) {
        // Extract filename from URL
        const urlParts = profile.qr_code_url.split("/");
        const oldFileName = urlParts[urlParts.length - 1];
        if (oldFileName && oldFileName.startsWith("qr-")) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      // Update profile with new QR code URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ qr_code_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile({
        ...profile!,
        qr_code_url: publicUrl,
      });
      setQrCodePreview(null); // Clear preview since we have the real URL now
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to upload QR code");
      setQrCodePreview(null); // Clear preview on error
    } finally {
      setUploadingQR(false);
    }

    // Reset file input
    e.target.value = "";
  };

  const handleGenerateQRCode = async () => {
    if (!profile?.handle) {
      setError("Please save your profile with a handle first");
      return;
    }

    setGeneratingQR(true);
    setError(null);

    try {
      const profileUrl = `${window.location.origin}/u/${encodeURIComponent(profile.handle)}`;

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(profileUrl, {
        width: 512,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });

      // Convert data URL to blob
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      const file = new File([blob], `qr-${profile.handle}.png`, { type: "image/png" });

      // Upload to Supabase Storage
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const fileName = `qr-${user.id}-${Date.now()}.png`;
      const filePath = fileName;

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

      // Delete old QR code if it exists
      if (profile?.qr_code_url) {
        const urlParts = profile.qr_code_url.split("/");
        const oldFileName = urlParts[urlParts.length - 1];
        if (oldFileName && oldFileName.startsWith("qr-")) {
          await supabase.storage.from("avatars").remove([oldFileName]);
        }
      }

      // Update profile with new QR code URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ qr_code_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Update local state
      setProfile({
        ...profile!,
        qr_code_url: publicUrl,
      });
      setQrCodePreview(publicUrl);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to generate QR code");
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleDownloadQRCode = async () => {
    if (!profile?.qr_code_url && !qrCodePreview) {
      setError("No QR code available to download");
      return;
    }

    try {
      const qrUrl = qrCodePreview || profile?.qr_code_url;
      if (!qrUrl) return;

      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${profile?.handle || "profile"}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setShareMessage("QR code downloaded!");
      setTimeout(() => setShareMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to download QR code");
    }
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

              <div className="divider mt-6">Social Media</div>

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

              <div className="divider mt-6">Privacy Settings</div>

              <fieldset className="fieldset">
                <div className="form-control">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="label sm:w-32">
                      <span className="label-text font-semibold">Search Engine Visibility</span>
                    </label>
                    <div className="flex-1 flex items-center gap-4">
                      <label className="label cursor-pointer gap-4">
                        <span className="label-text">
                          {formData.searchable
                            ? "Your profile can be found in search engines"
                            : "Your profile is hidden from search engines"}
                        </span>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={formData.searchable}
                          onChange={(e) =>
                            setFormData({ ...formData, searchable: e.target.checked })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
                <p className="label text-sm text-base-content/70 mt-2">
                  When disabled, search engines will not index your profile page.
                </p>
              </fieldset>

              <div className="divider mt-6">QR Code</div>

              <fieldset className="fieldset">
                <div className="form-control">
                  <div className="flex flex-col gap-4 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <label className="label sm:w-32">
                        <span className="label-text font-semibold">QR Code</span>
                      </label>
                      <div className="flex-1">
                        {(qrCodePreview || profile?.qr_code_url) && (
                          <div className="mb-4 flex flex-col items-center gap-3">
                            <div className="border-2 border-base-300 rounded-lg p-4 bg-base-200">
                              <img
                                src={qrCodePreview || profile?.qr_code_url || ""}
                                alt="QR Code"
                                className="w-48 h-48 object-contain"
                              />
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center">
                              <button
                                type="button"
                                onClick={handleDownloadQRCode}
                                className="btn btn-sm btn-outline"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                Download
                              </button>
                              <button
                                type="button"
                                onClick={handleGenerateQRCode}
                                disabled={generatingQR || !profile?.handle}
                                className="btn btn-sm btn-primary"
                              >
                                {generatingQR ? (
                                  <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Regenerating...
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    Regenerate
                                  </>
                                )}
                              </button>
                              <label className="btn btn-sm btn-outline cursor-pointer">
                                {uploadingQR ? (
                                  <span className="loading loading-spinner loading-xs"></span>
                                ) : (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                                Replace
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={handleQRCodeChange}
                                  disabled={uploadingQR}
                                />
                              </label>
                            </div>
                          </div>
                        )}
                        {!qrCodePreview && !profile?.qr_code_url && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <button
                              type="button"
                              onClick={handleGenerateQRCode}
                              disabled={generatingQR || !profile?.handle}
                              className="btn btn-primary btn-sm"
                            >
                              {generatingQR ? (
                                <>
                                  <span className="loading loading-spinner loading-xs"></span>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Generate QR Code
                                </>
                              )}
                            </button>
                            <label className="btn btn-outline btn-sm cursor-pointer">
                              {uploadingQR ? (
                                <span className="loading loading-spinner loading-xs"></span>
                              ) : (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              Upload QR Code
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleQRCodeChange}
                                disabled={uploadingQR}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-base-content/70 mt-2 max-w-full">
                      Generate a QR code for your profile URL or upload your own custom QR code. The QR code will be displayed on your public profile page.
                    </p>
                  </div>
                </div>
              </fieldset>

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

        {/* Delete Account Section */}
        <div className="card bg-base-100 shadow-xl border-2 border-error">
          <div className="card-body p-4 sm:p-6">
            <h2 className="card-title text-error text-xl sm:text-2xl mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Delete Account
            </h2>

            <div className="alert alert-error mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current shrink-0 h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold">
                Warning: This action cannot be undone. This will permanently delete your account,
                release all your card codes, and remove all your data.
              </span>
            </div>

            <p className="text-base-content/70 mb-4">
              If you are sure you want to delete your account, please enter your password below to confirm:
            </p>

            {deletePasswordError && (
              <div className="alert alert-error mb-4">
                <span>{deletePasswordError}</span>
              </div>
            )}

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text font-semibold">Password</span>
              </label>
              <input
                type="password"
                className="input input-bordered input-error"
                value={deletePassword}
                onChange={(e) => {
                  setDeletePassword(e.target.value);
                  setDeletePasswordError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && deletePassword) {
                    handleDeleteAccount();
                  }
                }}
                placeholder="Enter your password to confirm deletion"
              />
            </div>

            <button
              className="btn btn-error w-full sm:w-auto"
              onClick={handleDeleteAccount}
              disabled={!deletePassword || deleting || saving}
            >
              {deleting ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Deleting Account...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Delete My Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
