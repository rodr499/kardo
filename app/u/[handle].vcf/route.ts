import { createSupabaseServerClient } from "@/lib/supabase/server";

function esc(v?: string | null) {
  return (v ?? "").replace(/\n/g, " ").trim();
}

export async function GET(_: Request, { params }: { params: { handle: string } }) {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("profiles")
    .select("display_name,title,phone,email,website")
    .eq("handle", params.handle)
    .maybeSingle();

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const fullName = esc(data.display_name);
  const vcf = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fullName}`,
    data.title ? `TITLE:${esc(data.title)}` : null,
    data.phone ? `TEL;TYPE=CELL:${esc(data.phone)}` : null,
    data.email ? `EMAIL;TYPE=INTERNET:${esc(data.email)}` : null,
    data.website ? `URL:${esc(data.website)}` : null,
    "END:VCARD",
  ].filter(Boolean).join("\r\n");

  return new Response(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `inline; filename="${params.handle}.vcf"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
