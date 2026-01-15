import { createSupabaseServerClient } from "@/lib/supabase/server";

function clean(v: unknown) {
  return String(v ?? "")
    .replace(/\r?\n|\r/g, " ")
    .trim();
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle: handleParam } = await params;
  // Decode URL-encoded handle and normalize (lowercase for case-insensitive lookup)
  const handle = decodeURIComponent(handleParam).toLowerCase().trim();

  const fallbackName = handle;

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name,title,phone,country_code,email,website")
    .ilike("handle", handle) // Case-insensitive lookup
    .maybeSingle();

  if (error) {
    return new Response(
      JSON.stringify({ error: "Database error", message: error.message }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: "Profile not found" }),
      { 
        status: 404,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  const fullName = clean(data.display_name) || fallbackName;

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fullName}`,
  ];

  const title = clean(data.title);
  if (title) lines.push(`TITLE:${title}`);

  // Combine country code and phone number for vCard
  const countryCode = data.country_code || "+1";
  const phone = clean(data.phone);
  if (phone) {
    const fullPhone = countryCode + phone;
    lines.push(`TEL;TYPE=CELL:${fullPhone}`);
  }

  const email = clean(data.email);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`);

  const website = clean(data.website);
  if (website && isValidUrl(website)) {
    lines.push(`URL:${website}`);
  }

  lines.push("END:VCARD");

  const vcf = lines.join("\r\n") + "\r\n";

  return new Response(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `inline; filename="${handle}.vcf"`,
      "Cache-Control": "no-store",
    },
  });
}