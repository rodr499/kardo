"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import QRCode from "qrcode";

interface Profile {
  id: string;
  handle: string;
  display_name: string | null;
  searchable: boolean | null;
  qr_code_url: string | null;
  show_qr_code: boolean | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    searchable: false,
    show_qr_code: true,
  });

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/settings");
        return;
      }

      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id,handle,display_name,searchable,qr_code_url,show_qr_code")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        setError("Failed to load profile");
        setLoading(false);
        return;
      }

      if (profileData) {
        setProfile(profileData);
        setFormData({
          searchable: profileData.searchable ?? false,
          show_qr_code: profileData.show_qr_code ?? true,
        });

        // Set QR code preview if qr_code_url exists
        if (profileData.qr_code_url) {
          setQrCodePreview(profileData.qr_code_url);
        }
      }

      setLoading(false);
    };

    loadProfile();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const supabase = createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          searchable: formData.searchable ?? false,
          show_qr_code: formData.show_qr_code ?? true,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setSuccess("Settings saved successfully!");
      if (profile) {
        setProfile({
          ...profile,
          searchable: formData.searchable ?? false,
          show_qr_code: formData.show_qr_code ?? true,
        });
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
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
      setSuccess("QR code uploaded successfully!");
      setTimeout(() => setSuccess(null), 3000);
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
      setSuccess("QR code generated successfully!");
      setTimeout(() => setSuccess(null), 3000);
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
      setSuccess("QR code downloaded!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to download QR code");
    }
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

  // Load theme preference on mount and set page title
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    const html = document.documentElement;
    html.setAttribute("data-theme", savedTheme);
    document.title = "Settings - Kardo";
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
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body p-4 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">Settings</h1>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="divider">Privacy Settings</div>

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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <label className="label sm:w-32">
                      <span className="label-text font-semibold">Show on Public Profile</span>
                    </label>
                    <div className="flex-1 flex items-center gap-4">
                      <label className="label cursor-pointer gap-4">
                        <span className="label-text">
                          {formData.show_qr_code
                            ? "QR code is visible on your public profile"
                            : "QR code is hidden from your public profile"}
                        </span>
                        <input
                          type="checkbox"
                          className="toggle toggle-primary"
                          checked={formData.show_qr_code}
                          onChange={(e) =>
                            setFormData({ ...formData, show_qr_code: e.target.checked })
                          }
                        />
                      </label>
                    </div>
                  </div>
                  <p className="label text-sm text-base-content/70 mt-2">
                    When enabled, visitors to your public profile can see and scan your QR code.
                  </p>
                </div>
              </fieldset>

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
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </form>
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
              <label className="label sm:w-32">
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
