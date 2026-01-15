import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DevCardPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).toUpperCase();

  const supabase = createSupabaseServerClient();
  const { data: card, error } = await supabase
    .from("cards")
    .select("code,status,profile_id,created_at,claimed_at")
    .eq("code", code)
    .maybeSingle();

  return (
    <main className="min-h-screen p-6">
      <pre className="whitespace-pre-wrap">
        {JSON.stringify({ code, card, error: error?.message }, null, 2)}
      </pre>
    </main>
  );
}
