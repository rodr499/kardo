import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Crockford-ish Base32 (no I, O, 0, 1) — matches our generator alphabet
const CODE_RE = /^[A-HJ-NP-Z2-9]{6,16}$/i;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: raw } = await params;
  
  // Get origin from request headers to properly handle IP addresses
  const host = req.headers.get("host") || req.nextUrl.host;
  const protocol = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol || "http";
  const origin = `${protocol}://${host}`;

  const code = decodeURIComponent(raw).toUpperCase();

  // Validate code format (prevents junk requests + makes logs cleaner)
  if (!CODE_RE.test(code)) {
    return NextResponse.redirect(new URL(`/unknown-card`, origin));
  }

  const supabase = await createSupabaseServerClient();

  // 1) Lookup card
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("code,status,profile_id")
    .eq("code", code)
    .maybeSingle();

  if (cardError) {
    return new NextResponse(
      JSON.stringify({ error: "Card lookup error", message: cardError.message }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  if (!card) {
    return NextResponse.redirect(new URL(`/unknown-card`, origin));
  }

  if (card.status === "disabled") {
    return NextResponse.redirect(new URL(`/card-disabled`, origin));
  }

  if (card.status === "unclaimed" || !card.profile_id) {
    return NextResponse.redirect(new URL(`/claim?code=${encodeURIComponent(code)}`, origin));
  }

  // 2) Lookup profile handle
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", card.profile_id)
    .maybeSingle();

  if (profileError) {
    return new NextResponse(
      JSON.stringify({ error: "Profile lookup error", message: profileError.message }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  if (!profile?.handle) {
    return NextResponse.redirect(new URL(`/claim?code=${encodeURIComponent(code)}`, origin));
  }

  // Stage 4 privacy will hook in right here
  return NextResponse.redirect(new URL(`/u/${profile.handle}`, origin));
}