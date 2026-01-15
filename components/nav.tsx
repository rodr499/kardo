"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function Nav() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      setLoading(false);
    };

    checkAuth();

    // Listen for auth changes
    const supabase = createSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkAuth();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="navbar bg-base-100 shadow-sm">
      <div className="container mx-auto px-6">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-xl font-bold">
            Kardo
          </Link>
        </div>
        <div className="flex-none gap-2">
          {!loading && (
            <>
              {isAuthenticated ? (
                <>
                  <Link href="/profile" className="btn btn-ghost">
                    My Profile
                  </Link>
                  <Link href="/claim" className="btn btn-ghost">
                    Claim Card
                  </Link>
                </>
              ) : (
                <Link href="/login" className="btn btn-primary">
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
