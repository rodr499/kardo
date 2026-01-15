import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: handleParam } = await params;
  // Decode URL-encoded handle and normalize (lowercase for case-insensitive lookup)
  const handle = decodeURIComponent(handleParam).toLowerCase().trim();

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("handle,display_name,title,phone,country_code,email,website,avatar_url")
    .ilike("handle", handle) // Case-insensitive lookup
    .maybeSingle();

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === "development") {
    console.log("[ProfilePage] Query:", { handle, data: !!data, error: error?.message });
  }

  if (error) {
    return (
      <main className="min-h-screen p-6 bg-base-200">
        <div className="max-w-md mx-auto card bg-base-100 shadow">
          <div className="card-body">
            <h1 className="card-title text-error">Error loading profile</h1>
            <p className="text-sm opacity-70">
              We encountered an issue loading this profile. Please try again later.
            </p>
            <div className="mt-4">
              <Link className="btn btn-primary" href="/">
                Go home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) return notFound();

  // Helper function to get initials from display name
  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <main className="min-h-screen p-5 bg-base-200">
      <div className="max-w-md mx-auto space-y-4">
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <div className="flex items-center gap-4 mb-4">
              <div className="avatar">
                <div className="rounded-full w-16 h-16 flex items-center justify-center overflow-hidden bg-primary text-primary-content">
                  {data.avatar_url ? (
                    <img
                      src={data.avatar_url}
                      alt={data.display_name || "Avatar"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold">
                      {getInitials(data.display_name)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold">{data.display_name}</h1>
                {data.title ? <p className="text-base-content/70">{data.title}</p> : null}
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <a className="btn btn-primary" href={`/u/${data.handle}.vcf`}>
                Add to Contacts
              </a>

              {data.phone ? (
                <a className="btn btn-outline" href={`tel:${data.country_code || "+1"}${data.phone}`}>Call</a>
              ) : null}

              {data.email ? (
                <a className="btn btn-outline" href={`mailto:${data.email}`}>Email</a>
              ) : null}

              {data.website ? (
                <Link 
                  className="btn btn-outline" 
                  href={data.website.startsWith("http") ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Website
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-base-content/60">
          Powered by <span className="font-semibold">Kardo</span>
        </div>
      </div>
    </main>
  );
}