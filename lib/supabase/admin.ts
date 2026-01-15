import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase admin client with service role key.
 * This has elevated permissions and can delete auth users.
 * 
 * IMPORTANT: This should ONLY be used server-side and never exposed to the client.
 * Set SUPABASE_SERVICE_ROLE_KEY in your environment variables.
 */
export function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
