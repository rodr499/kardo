"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Get redirect URL and preserve any query params (like code)
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam || "/profile";
  
  // Extract code from redirect URL if present
  const codeFromRedirect = redirectParam?.includes("code=") 
    ? new URLSearchParams(redirectParam.split("?")[1] || "").get("code") 
    : null;
  
  // Check if coming from claim page (allows registration even if disabled)
  // Only allow registration if explicitly redirected from claim page AND code exists
  const [isFromClaim, setIsFromClaim] = useState(false);
  const [validatingCode, setValidatingCode] = useState(false);
  const [cardAlreadyClaimed, setCardAlreadyClaimed] = useState(false);

  // Load registration settings and validate code if coming from claim
  useEffect(() => {
    const loadSettingsAndValidate = async () => {
      const supabase = createSupabaseClient();
      
      // Load registration settings
      const { data: settings, error: settingsError } = await supabase
        .from("settings")
        .select("registration_enabled")
        .eq("id", "app")
        .maybeSingle();

      if (!settingsError && settings) {
        setRegistrationEnabled(settings.registration_enabled ?? true);
      }

      // If coming from claim with a code, validate the code exists
      if (redirectParam && (redirectParam.includes("/claim") || codeFromRedirect)) {
        setValidatingCode(true);
        
        if (codeFromRedirect) {
          const { data: card, error: cardError } = await supabase
            .from("cards")
            .select("code,status,profile_id")
            .eq("code", codeFromRedirect.toUpperCase())
            .maybeSingle();

          if (cardError || !card) {
            // Code doesn't exist
            setError("Invalid card code. Please check the code and try again.");
            setIsFromClaim(false);
          } else if (card.status === "disabled") {
            // Code is disabled
            setError("This card has been disabled.");
            setIsFromClaim(false);
          } else if (card.profile_id) {
            // Card is already claimed - redirect to card view, don't allow registration
            setIsFromClaim(false);
            setCardAlreadyClaimed(true);
            // Clear any error since the card exists, just claimed
            setError(null);
          } else {
            // Code exists, is active, and is unclaimed - allow registration
            setIsFromClaim(true);
          }
        } else if (redirectParam.includes("/claim")) {
          // Coming from claim page but no code in URL yet - allow it
          setIsFromClaim(true);
        }
        
        setValidatingCode(false);
      }

      setLoadingSettings(false);
    };

    loadSettingsAndValidate();
  }, [redirectParam, codeFromRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent sign up if registration is disabled and not from claim
    if (isSignUp && !registrationEnabled && !isFromClaim) {
      setError("Registration is currently disabled. Please use a card code to register.");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const supabase = createSupabaseClient();

    try {
      if (isSignUp) {
        // For sign up, preserve redirect in email callback
        // Use NEXT_PUBLIC_SITE_URL if set (for production), otherwise use current origin
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const callbackUrl = redirectTo 
          ? `${siteUrl}/auth/callback?next=${encodeURIComponent(redirectTo)}`
          : `${siteUrl}/auth/callback`;
        
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: callbackUrl,
          },
        });

        if (signUpError) throw signUpError;

        setMessage("Check your email to confirm your account! After confirming, you'll be redirected to claim your card.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Preserve the full redirect URL (including code param)
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 sm:p-6 bg-base-200 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold">
                {isSignUp ? "Create Account" : "Welcome to Kardo"}
              </h1>
              <p className="text-base-content/70 mt-1 text-sm sm:text-base">
                {isSignUp
                  ? "Sign up to claim your digital business card"
                  : "Sign in to manage your profile"}
              </p>
            </div>

            {error && (
              <div className="alert alert-error">
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="alert alert-success">
                <span>{message}</span>
              </div>
            )}

            {cardAlreadyClaimed && (
              <div className="alert alert-info">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 shrink-0 stroke-current"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  This card code is already in use. Please sign in to view the card or use a different code.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered w-full"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              {/* Only show sign up option if registration is enabled OR coming from claim page with valid code */}
              {(registrationEnabled || (isFromClaim && !validatingCode)) && (
                <>
                  <div className="divider mt-6"></div>

                  <div className="flex flex-col gap-3">
                    <button
                      type="submit"
                      className="btn btn-primary w-full"
                      disabled={loading || loadingSettings}
                    >
                      {loading ? (
                        <>
                          <span className="loading loading-spinner"></span>
                          {isSignUp ? "Signing Up..." : "Signing In..."}
                        </>
                      ) : isSignUp ? (
                        "Sign Up"
                      ) : (
                        "Sign In"
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setError(null);
                        setMessage(null);
                      }}
                      className="btn btn-outline w-full"
                      disabled={loading || loadingSettings}
                    >
                      {isSignUp
                        ? "Already have an account? Sign In"
                        : "Don't have an account? Sign Up"}
                    </button>
                  </div>
                </>
              )}

              {/* If registration is disabled and not from claim, only show sign in */}
              {!registrationEnabled && !isFromClaim && !validatingCode && (
                <>
                  <div className="divider mt-6"></div>

                  <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={loading || loadingSettings}
                  >
                    {loading ? (
                      <>
                        <span className="loading loading-spinner"></span>
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>

                  <div className="alert alert-info mt-4">
                    <span>
                      Registration is currently closed. To create an account, you need a card code.{" "}
                      <Link href="/claim" className="link link-hover font-semibold">
                        Claim a card here
                      </Link>
                    </span>
                  </div>
                </>
              )}

              <div className="text-center mt-4">
                <Link href="/" className="link link-hover text-sm">
                  ← Back to home
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen p-6 bg-base-200 flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
