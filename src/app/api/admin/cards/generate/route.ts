import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Crockford Base32 alphabet (no I, O, 0, 1)
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generate a random card code
 * @param length - Length of the code (default: 8)
 * @returns A random code string
 */
function generateCardCode(length: number = 8): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET.charAt(
      Math.floor(Math.random() * CODE_ALPHABET.length)
    );
  }
  return code;
}

/**
 * Generate unique card codes that don't exist in the database
 * @param count - Number of codes to generate
 * @param length - Length of each code
 * @param supabase - Supabase client
 * @returns Array of unique codes
 */
async function generateUniqueCodes(
  count: number,
  length: number,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
): Promise<string[]> {
  const codes: string[] = [];
  const maxAttempts = count * 100; // Prevent infinite loops
  let attempts = 0;

  while (codes.length < count && attempts < maxAttempts) {
    attempts++;
    const code = generateCardCode(length);

    // Check if code already exists
    const { data: existingCard } = await supabase
      .from("cards")
      .select("code")
      .eq("code", code)
      .maybeSingle();

    // If code doesn't exist and we don't already have it, add it
    if (!existingCard && !codes.includes(code)) {
      codes.push(code);
    }
  }

  if (codes.length < count) {
    throw new Error(
      `Failed to generate ${count} unique codes after ${maxAttempts} attempts. Please try again with a smaller count or different code length.`
    );
  }

  return codes;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.user_type !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse request body
    const body = await req.json();
    const count = Math.min(Math.max(parseInt(body.count || "1", 10), 1), 1000); // Limit between 1 and 1000
    const codeLength = Math.min(
      Math.max(parseInt(body.codeLength || "8", 10), 6),
      16
    ); // Limit between 6 and 16

    // Generate unique codes
    const codes = await generateUniqueCodes(count, codeLength, supabase);

    // Insert cards into database
    const cardsToInsert = codes.map((code) => ({
      code,
      status: "unclaimed",
      nfc_tag_assigned: false,
    }));

    const { data: insertedCards, error: insertError } = await supabase
      .from("cards")
      .insert(cardsToInsert)
      .select("code");

    if (insertError) {
      console.error("Error inserting cards:", insertError);
      return NextResponse.json(
        { error: "Failed to create cards: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: insertedCards?.length || 0,
      codes: insertedCards?.map((c) => c.code) || [],
    });
  } catch (error: any) {
    console.error("Card generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate cards" },
      { status: 500 }
    );
  }
}
