"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Card {
  code: string;
  status: string;
  created_at: string;
  claimed_at: string | null;
  profile_id: string | null;
  nfc_tag_assigned: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [filter, setFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [searchCode, setSearchCode] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [updatingSettings, setUpdatingSettings] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: "unclaim" | "assign";
    code: string;
    currentValue?: boolean;
  } | null>(null);

  useEffect(() => {
    document.title = "Admin Dashboard - Kardo";
    
    const loadData = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?redirect=/admin");
        return;
      }

      // Check if user is super_admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.user_type !== "super_admin") {
        router.push("/");
        return;
      }

      setIsAdmin(true);
      await loadCards(supabase);
      await loadSettings(supabase);
      setLoading(false);
    };

    loadData();
  }, [router]);

  const loadSettings = async (supabase: ReturnType<typeof createSupabaseClient>) => {
    const { data, error } = await supabase
      .from("settings")
      .select("registration_enabled")
      .eq("id", "app")
      .maybeSingle();

    if (error) {
      console.error("Error loading settings:", error);
    } else {
      setRegistrationEnabled(data?.registration_enabled ?? true);
    }
  };

  const toggleRegistration = async () => {
    setUpdatingSettings(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = createSupabaseClient();
      const { error: updateError } = await supabase
        .from("settings")
        .update({ registration_enabled: !registrationEnabled })
        .eq("id", "app");

      if (updateError) throw updateError;

      setRegistrationEnabled(!registrationEnabled);
      setSuccess(`Registration ${!registrationEnabled ? "enabled" : "disabled"} successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update settings");
    } finally {
      setUpdatingSettings(false);
    }
  };

  const loadCards = async (supabase: ReturnType<typeof createSupabaseClient>) => {
    const { data, error } = await supabase
      .from("cards")
      .select("code,status,created_at,claimed_at,profile_id,nfc_tag_assigned")
      .order("code", { ascending: true });

    if (error) {
      setError("Failed to load cards: " + error.message);
    } else {
      setCards(data || []);
    }
  };

  const requestPasswordConfirmation = (type: "unclaim" | "assign", code: string, currentValue?: boolean) => {
    setPendingAction({ type, code, currentValue });
    setShowPasswordModal(true);
    setPassword("");
    setPasswordError(null);
  };

  const verifyPassword = async () => {
    if (!password || !pendingAction) return;

    setPasswordError(null);
    setUpdating(pendingAction.code);

    try {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        throw new Error("User not found");
      }

      // Re-authenticate with password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        throw new Error("Incorrect password");
      }

      // Password verified, proceed with action
      setShowPasswordModal(false);
      setPassword("");

      if (pendingAction.type === "unclaim") {
        await executeUnclaim(pendingAction.code);
      } else {
        await executeToggleAssignment(pendingAction.code, pendingAction.currentValue!);
      }

      setPendingAction(null);
    } catch (err: any) {
      setPasswordError(err.message || "Password verification failed");
      setUpdating(null);
    }
  };

  const executeToggleAssignment = async (code: string, currentValue: boolean) => {
    setError(null);
    setSuccess(null);

    try {
      const supabase = createSupabaseClient();
      const { error: updateError } = await supabase
        .from("cards")
        .update({ nfc_tag_assigned: !currentValue })
        .eq("code", code);

      if (updateError) throw updateError;

      // Reload cards
      await loadCards(supabase);
      setSuccess(`Card ${code} ${!currentValue ? "assigned" : "unassigned"} to NFC tag`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update card");
    } finally {
      setUpdating(null);
    }
  };

  const toggleNfcAssignment = (code: string, currentValue: boolean) => {
    if (currentValue) {
      // Only require password for unassigning
      requestPasswordConfirmation("assign", code, currentValue);
    } else {
      // Assigning doesn't need password
      executeToggleAssignment(code, currentValue);
    }
  };

  const unclaimCard = (code: string) => {
    requestPasswordConfirmation("unclaim", code);
  };

  const executeUnclaim = async (code: string) => {
    setError(null);
    setSuccess(null);

    try {
      const supabase = createSupabaseClient();
      const { error: updateError } = await supabase
        .from("cards")
        .update({ 
          profile_id: null,
          claimed_at: null,
          status: "unclaimed"
        })
        .eq("code", code);

      if (updateError) throw updateError;

      // Reload cards
      await loadCards(supabase);
      setSuccess(`Card ${code} has been unclaimed successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to unclaim card");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-6 bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </main>
    );
  }

  if (!isAdmin) {
    return null;
  }

  // Filter cards
  const filteredCards = cards.filter((card) => {
    // Search filter
    if (searchCode && !card.code.toLowerCase().includes(searchCode.toLowerCase())) {
      return false;
    }

    // Status filter
    if (filter === "assigned" && !card.nfc_tag_assigned) return false;
    if (filter === "unassigned" && card.nfc_tag_assigned) return false;

    return true;
  });

  const stats = {
    total: cards.length,
    assigned: cards.filter((c) => c.nfc_tag_assigned).length,
    unassigned: cards.filter((c) => !c.nfc_tag_assigned).length,
    claimed: cards.filter((c) => c.claimed_at !== null).length,
    unclaimed: cards.filter((c) => c.claimed_at === null).length,
  };

  return (
    <main className="min-h-screen p-6 bg-base-200">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className="text-base-content/70 mt-1">NFC Tag Assignment Management</p>
              </div>
              <Link href="/profile" className="btn btn-outline">
                Back to Profile
              </Link>
            </div>

            {/* Settings Section */}
            <div className="card bg-base-200 shadow mb-6">
              <div className="card-body">
                <h2 className="card-title text-xl mb-4">App Settings</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Registration</h3>
                    <p className="text-sm text-base-content/70 mt-1">
                      {registrationEnabled
                        ? "Registration is open. Users can sign up from the login page."
                        : "Registration is closed. Users can only register when claiming a card."}
                    </p>
                  </div>
                  <div className="form-control">
                    <label className="label cursor-pointer gap-4">
                      <span className="label-text font-semibold">
                        {registrationEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={registrationEnabled}
                        onChange={toggleRegistration}
                        disabled={updatingSettings}
                      />
                    </label>
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
              <div className="alert alert-success">
                <span>{success}</span>
              </div>
            )}

            {/* Password Confirmation Modal */}
            {showPasswordModal && (
              <div className="modal modal-open">
                <div className="modal-box">
                  <h3 className="font-bold text-lg mb-4">Confirm Admin Action</h3>
                  <p className="mb-4 text-base-content/70">
                    {pendingAction?.type === "unclaim"
                      ? `Please enter your password to unclaim card ${pendingAction.code}.`
                      : `Please enter your password to unassign card ${pendingAction?.code} from NFC tag.`}
                  </p>
                  
                  {passwordError && (
                    <div className="alert alert-error mb-4">
                      <span>{passwordError}</span>
                    </div>
                  )}

                  <div className="form-control mb-4">
                    <label className="label">
                      <span className="label-text">Password</span>
                    </label>
                    <input
                      type="password"
                      className="input input-bordered"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setPasswordError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && password) {
                          verifyPassword();
                        }
                      }}
                      placeholder="Enter your password"
                      autoFocus
                    />
                  </div>

                  <div className="modal-action">
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPassword("");
                        setPasswordError(null);
                        setPendingAction(null);
                        setUpdating(null);
                      }}
                      disabled={updating !== null}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={verifyPassword}
                      disabled={!password || updating !== null}
                    >
                      {updating ? (
                        <>
                          <span className="loading loading-spinner"></span>
                          Verifying...
                        </>
                      ) : (
                        "Confirm"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Total Cards</div>
                <div className="stat-value text-lg">{stats.total}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Assigned to NFC</div>
                <div className="stat-value text-lg text-success">{stats.assigned}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Unassigned</div>
                <div className="stat-value text-lg text-warning">{stats.unassigned}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Claimed</div>
                <div className="stat-value text-lg text-info">{stats.claimed}</div>
              </div>
              <div className="stat bg-base-200 rounded-lg">
                <div className="stat-title">Unclaimed</div>
                <div className="stat-value text-lg">{stats.unclaimed}</div>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by code..."
                  className="input input-bordered w-full"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                />
              </div>
              <div className="tabs tabs-boxed">
                <button
                  className={`tab ${filter === "all" ? "tab-active" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  All
                </button>
                <button
                  className={`tab ${filter === "assigned" ? "tab-active" : ""}`}
                  onClick={() => setFilter("assigned")}
                >
                  Assigned
                </button>
                <button
                  className={`tab ${filter === "unassigned" ? "tab-active" : ""}`}
                  onClick={() => setFilter("unassigned")}
                >
                  Unassigned
                </button>
              </div>
            </div>

            {/* Cards Table */}
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Status</th>
                    <th>NFC Assigned</th>
                    <th>Claimed</th>
                    <th>Claimed By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCards.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-base-content/70">
                        No cards found
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map((card) => (
                      <tr key={card.code}>
                        <td>
                          <code className="font-mono font-bold">{card.code}</code>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              card.status === "active"
                                ? "badge-success"
                                : card.status === "disabled"
                                ? "badge-error"
                                : "badge-warning"
                            }`}
                          >
                            {card.status}
                          </span>
                        </td>
                        <td>
                          {card.nfc_tag_assigned ? (
                            <span className="badge badge-success">Yes</span>
                          ) : (
                            <span className="badge badge-warning">No</span>
                          )}
                        </td>
                        <td>
                          {card.claimed_at ? (
                            <span className="text-sm">
                              {new Date(card.claimed_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-base-content/50">Unclaimed</span>
                          )}
                        </td>
                        <td>
                          {card.claimed_at ? (
                            <a
                              href={`/c/${encodeURIComponent(card.code)}`}
                              className="link link-primary text-sm"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View Card
                            </a>
                          ) : (
                            <span className="text-base-content/50 text-sm">Unclaimed</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className={`btn btn-sm ${
                                card.nfc_tag_assigned
                                  ? "btn-warning"
                                  : "btn-success"
                              }`}
                              onClick={() => toggleNfcAssignment(card.code, card.nfc_tag_assigned)}
                              disabled={updating === card.code}
                            >
                              {updating === card.code ? (
                                <span className="loading loading-spinner"></span>
                              ) : card.nfc_tag_assigned ? (
                                "Unassign"
                              ) : (
                                "Assign"
                              )}
                            </button>
                            {card.claimed_at && (
                              <button
                                className="btn btn-sm btn-error"
                                onClick={() => unclaimCard(card.code)}
                                disabled={updating === card.code}
                                title="Unclaim this card from the user"
                              >
                                {updating === card.code ? (
                                  <span className="loading loading-spinner"></span>
                                ) : (
                                  "Unclaim"
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-base-content/50 mt-4">
              Showing {filteredCards.length} of {cards.length} cards
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
