import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;
  // Get origin from request URL to handle IP addresses correctly
  const origin = `${requestUrl.protocol}//${requestUrl.host}`;
  const code = searchParams.get("code"); // Auth code from Supabase
  const next = searchParams.get("next") ?? "/claim";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Preserve the full redirect URL (including any query params like code)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
