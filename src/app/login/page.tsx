"use client";

import { useState, Suspense } from "react";
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

  // Get redirect URL and preserve any query params (like code)
  const redirectParam = searchParams.get("redirect");
  const redirectTo = redirectParam || "/claim";
  
  // If redirect contains code param, make sure it's preserved
  const hasCodeInRedirect = redirectTo.includes("code=");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <main className="min-h-screen p-6 bg-base-200 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="text-3xl font-bold text-center mb-2">
              {isSignUp ? "Create Account" : "Welcome to Kardo"}
            </h1>
            <p className="text-center text-base-content/70 mb-6">
              {isSignUp
                ? "Sign up to claim your digital business card"
                : "Sign in to manage your profile"}
            </p>

            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="alert alert-success mb-4">
                <span>{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Email</span>
                </label>
                <input
                  type="email"
                  className="input input-bordered"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Password</span>
                </label>
                <input
                  type="password"
                  className="input input-bordered"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
              >
                {loading ? (
                  <span className="loading loading-spinner"></span>
                ) : isSignUp ? (
                  "Sign Up"
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="divider">OR</div>

            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
              className="btn btn-outline w-full"
              disabled={loading}
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </button>

            <div className="text-center mt-4">
              <Link href="/" className="link link-hover text-sm">
                ← Back to home
              </Link>
            </div>
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
