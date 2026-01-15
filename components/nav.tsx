"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/client";

export default function Nav() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        // Check if user is super_admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_type")
          .eq("id", user.id)
          .maybeSingle();
        
        setIsAdmin(profile?.user_type === "super_admin");
      } else {
        setIsAdmin(false);
      }
      
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
        <div className="navbar-start">
          <Link href="/" className="btn btn-ghost text-xl font-bold">
            Kardo
          </Link>
        </div>
        <div className="navbar-end gap-2">
          {!loading && (
            <>
              {isAuthenticated ? (
                <>
                  {isAdmin && (
                    <Link href="/admin" className="btn btn-ghost">
                      Admin
                    </Link>
                  )}
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
