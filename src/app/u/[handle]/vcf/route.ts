import { createSupabaseServerClient } from "@/lib/supabase/server";

function clean(v: unknown) {
  return String(v ?? "")
    .replace(/\r?\n|\r/g, " ")
    .trim();
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;

  const fallbackName = handle;

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("display_name,title,phone,email,website")
    .eq("handle", handle)
    .maybeSingle();

  if (error) {
    return new Response(`Supabase error: ${error.message}`, { status: 500 });
  }

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const fullName = clean(data.display_name) || fallbackName;

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fullName}`,
  ];

  const title = clean(data.title);
  if (title) lines.push(`TITLE:${title}`);

  const phone = clean(data.phone);
  if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);

  const email = clean(data.email);
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${email}`);

  const website = clean(data.website);
  if (website) lines.push(`URL:${website}`);

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