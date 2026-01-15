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
  email: string | null;
  website: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    handle: "",
    display_name: "",
    title: "",
    phone: "",
    email: "",
    website: "",
  });

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
        setProfile(profileData);
        setFormData({
          handle: profileData.handle || "",
          display_name: profileData.display_name || "",
          title: profileData.title || "",
          phone: profileData.phone || "",
          email: profileData.email || "",
          website: profileData.website || "",
        });
      } else {
        // Create profile if it doesn't exist
        const email = user.email || "";
        const defaultHandle = email.split("@")[0] || `user-${user.id.slice(0, 8)}`;
        setFormData({
          handle: defaultHandle,
          display_name: defaultHandle,
          title: "",
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

      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          handle: formData.handle.trim(),
          display_name: formData.display_name.trim() || null,
          title: formData.title.trim() || null,
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          website: formData.website.trim() || null,
        });

      if (updateError) throw updateError;

      setSuccess(true);
      setProfile({
        id: user.id,
        ...formData,
      } as Profile);

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

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-base-200">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold">My Profile</h1>
              <button onClick={handleLogout} className="btn btn-sm btn-outline">
                Logout
              </button>
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success">
                <span>Profile saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Handle (URL)</span>
                </label>
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
                <div className="label">
                  <span className="label-text-alt">
                    Your profile will be at:{" "}
                    <Link
                      href={`/u/${formData.handle}`}
                      target="_blank"
                      className="link"
                    >
                      /u/{formData.handle}
                    </Link>
                  </span>
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Display Name</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.display_name}
                  onChange={(e) =>
                    setFormData({ ...formData, display_name: e.target.value })
                  }
                  placeholder="John Doe"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Software Engineer"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Phone</span>
                </label>
                <input
                  type="tel"
                  className="input input-bordered"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Website</span>
                </label>
                <input
                  type="url"
                  className="input input-bordered"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                  placeholder="https://example.com"
                />
              </div>

              <div className="flex gap-4 mt-6">
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
                    "Save Profile"
                  )}
                </button>
                {profile && (
                  <Link
                    href={`/u/${profile.handle}`}
                    target="_blank"
                    className="btn btn-outline"
                  >
                    View Profile
                  </Link>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">My Cards</h2>
              <Link href="/claim" className="btn btn-sm btn-primary">
                Claim a Card
              </Link>
            </div>
            
            {cards.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm opacity-70 mb-4">
                  You haven't claimed any cards yet.
                </p>
                <Link href="/claim" className="btn btn-primary btn-sm">
                  Claim Your First Card
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cards.map((card) => (
                  <div key={card.code} className="border border-base-300 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
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
                      <div className="flex gap-2">
                        <Link
                          href={`/c/${card.code}`}
                          className="btn btn-xs btn-outline"
                          target="_blank"
                        >
                          View
                        </Link>
                        <a
                          href={`/c/${card.code}`}
                          className="btn btn-xs btn-outline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Share Link
                        </a>
                      </div>
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
