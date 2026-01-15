"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";

function ClaimForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Set code from URL if present
    const codeParam = searchParams.get("code");
    if (codeParam) {
      setCode(codeParam.toUpperCase());
    }

    // Check authentication status
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsAuthenticated(!!user);
      setCheckingAuth(false);
    };

    checkAuth();
  }, [router, searchParams]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate code is entered
    const cardCode = code.toUpperCase().trim();
    if (!cardCode) {
      setError("Please enter a card code");
      return;
    }

    const supabase = createSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If not authenticated, redirect to login with code preserved
    if (!user) {
      const redirectUrl = `/login?redirect=${encodeURIComponent(`/claim?code=${cardCode}`)}`;
      router.push(redirectUrl);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if card exists and is claimable
      const { data: card, error: cardError } = await supabase
        .from("cards")
        .select("code,status,profile_id")
        .eq("code", cardCode)
        .maybeSingle();

      if (cardError) throw new Error("Failed to check card status");

      if (!card) {
        setError("Card not found. Please check the code and try again.");
        return;
      }

      if (card.status === "disabled") {
        setError("This card has been disabled.");
        return;
      }

      if (card.status !== "unclaimed" && card.profile_id) {
        // Card is already claimed - redirect to card lookup route which will show the profile
        router.push(`/c/${cardCode}`);
        return;
      }

      // Get or create profile
      let { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        // Create a basic profile
        const { data: newProfile, error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            handle: user.email?.split("@")[0] || `user-${user.id.slice(0, 8)}`,
            display_name: user.email?.split("@")[0] || "User",
          })
          .select()
          .single();

        if (profileError) throw profileError;
        profile = newProfile;
      }

      // Claim the card
      const { error: claimError } = await supabase
        .from("cards")
        .update({
          status: "active",
          profile_id: user.id,
          claimed_at: new Date().toISOString(),
        })
        .eq("code", cardCode);

      if (claimError) throw claimError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/profile");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to claim card. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen p-6 bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </main>
    );
  }

  // Show form even if not authenticated - user can enter code first

  return (
    <main className="min-h-screen p-6 bg-base-200">
      <div className="max-w-md mx-auto card bg-base-100 shadow">
        <div className="card-body">
          <h1 className="card-title">Claim your Kardo</h1>
          <p className="text-sm opacity-70">
            {isAuthenticated 
              ? "Enter your card code to claim it and link it to your profile."
              : "Enter your card code below. You'll be asked to sign in or create an account to complete the claim."
            }
          </p>

          {success && (
            <div className="alert alert-success mt-4">
              <span>Card claimed successfully! Redirecting to your profile...</span>
            </div>
          )}

          {error && (
            <div className="alert alert-error mt-4">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleClaim} className="mt-4">
            <label className="form-control">
              <div className="label">
                <span className="label-text">Card code</span>
              </div>
              <input
                type="text"
                className="input input-bordered font-mono"
                placeholder="AB7K9Q2M"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                required
                disabled={loading || success}
                pattern="[A-HJ-NP-Z2-9]{6,16}"
                title="Enter a valid card code (6-16 characters, no I, O, 0, or 1)"
              />
              <div className="label">
                <span className="label-text-alt opacity-60">
                  Enter the code from your physical card
                </span>
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-primary w-full mt-4"
              disabled={loading || success || !code}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Claiming...
                </>
              ) : success ? (
                "Claimed!"
              ) : isAuthenticated ? (
                "Claim Card"
              ) : (
                "Continue to Sign In"
              )}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/profile" className="link link-hover text-sm">
              Go to my profile →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-6 bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </main>
    }>
      <ClaimForm />
    </Suspense>
  );
}
