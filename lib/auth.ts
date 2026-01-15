import { createSupabaseServerClient } from "./supabase/server";
import { redirect } from "next/navigation";

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
}

export async function isSuperAdmin() {
  const profile = await getCurrentProfile();
  return profile?.user_type === "super_admin";
}

export async function requireSuperAdmin() {
  const user = await requireAuth();
  const isAdmin = await isSuperAdmin();
  if (!isAdmin) {
    redirect("/");
  }
  return user;
}
