import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle: handleParam } = await params;
  const handle = decodeURIComponent(handleParam).toLowerCase().trim();
  
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name,title,searchable")
    .ilike("handle", handle)
    .maybeSingle();

  const title = data?.display_name 
    ? `${data.display_name}${data.title ? ` - ${data.title}` : ""} - Kardo`
    : `${handle} - Kardo`;

  const metadata: Metadata = {
    title: title,
    description: data?.display_name 
      ? `View ${data.display_name}'s digital business card on Kardo`
      : "View digital business card on Kardo",
  };

  // If profile is not searchable, add noindex meta tag
  if (data && data.searchable === false) {
    metadata.robots = {
      index: false,
      follow: false,
    };
  }

  return metadata;
}

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
    .select("handle,display_name,title,phone,country_code,email,website,avatar_url,qr_code_url,show_qr_code,searchable,linkedin,twitter,instagram,facebook,tiktok,youtube,github,office_address,office_city,maps_link,best_time_to_contact,preferred_contact_method,department,team_name,manager,pronouns,name_pronunciation,bio,whatsapp,signal,telegram,sms_link,calendar_link,timezone,podcast_link,youtube_channel,sermon_series,featured_talk,company_name,division,office_phone,work_phone,personal_phone")
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
                {data.pronouns && (
                  <p className="text-sm text-base-content/60 mt-1">{data.pronouns}</p>
                )}
              </div>
            </div>

            {/* Bio */}
            {data.bio && (
              <div className="mb-4">
                <p className="text-sm text-base-content/80">{data.bio}</p>
              </div>
            )}

            {/* Organization Details */}
            {(data.company_name || data.department || data.team_name) && (
              <div className="mb-4">
                {data.company_name && (
                  <p className="text-sm font-semibold">{data.company_name}</p>
                )}
                {data.division && (
                  <p className="text-sm text-base-content/70">{data.division}</p>
                )}
                {data.department && (
                  <p className="text-sm text-base-content/70">{data.department}</p>
                )}
                {data.team_name && (
                  <p className="text-sm text-base-content/70">{data.team_name}</p>
                )}
                {data.manager && (
                  <p className="text-sm text-base-content/60 mt-1">Manager: {data.manager}</p>
                )}
              </div>
            )}

            {/* Name Pronunciation */}
            {data.name_pronunciation && (
              <div className="mb-4">
                <p className="text-sm text-base-content/70">
                  <span className="font-semibold">Pronunciation:</span> {data.name_pronunciation}
                </p>
              </div>
            )}

            <div className="mt-4 grid gap-2">
              <a className="btn btn-primary" href={`/u/${data.handle}.vcf`}>
                Add to Contacts
              </a>

              {data.phone ? (
                <a className="btn btn-outline" href={`tel:${data.country_code || "+1"}${data.phone}`}>Call</a>
              ) : null}

              {data.work_phone ? (
                <a className="btn btn-outline" href={`tel:${data.work_phone}`}>Work Phone</a>
              ) : null}

              {data.office_phone ? (
                <a className="btn btn-outline" href={`tel:${data.office_phone}`}>Office Phone</a>
              ) : null}

              {data.personal_phone ? (
                <a className="btn btn-outline" href={`tel:${data.personal_phone}`}>Personal Phone</a>
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

              {data.calendar_link && (
                <a 
                  className="btn btn-outline" 
                  href={data.calendar_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📅 Book a Meeting
                </a>
              )}

              {data.maps_link && (
                <a 
                  className="btn btn-outline" 
                  href={data.maps_link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📍 Get Directions
                </a>
              )}
            </div>

            {/* Availability */}
            {(data.best_time_to_contact || data.preferred_contact_method || data.timezone) && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <h3 className="text-sm font-semibold mb-2 text-base-content/70">Availability</h3>
                {data.best_time_to_contact && (
                  <p className="text-sm text-base-content/80 mb-1">
                    <span className="font-semibold">Best time:</span> {data.best_time_to_contact}
                  </p>
                )}
                {data.preferred_contact_method && (
                  <p className="text-sm text-base-content/80 mb-1">
                    <span className="font-semibold">Preferred method:</span> {data.preferred_contact_method}
                  </p>
                )}
                {data.timezone && (
                  <p className="text-sm text-base-content/80">
                    <span className="font-semibold">Timezone:</span> {data.timezone}
                  </p>
                )}
              </div>
            )}

            {/* Location */}
            {(data.office_address || data.office_city) && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <h3 className="text-sm font-semibold mb-2 text-base-content/70">📍 Location</h3>
                {data.office_address && (
                  <p className="text-sm text-base-content/80">{data.office_address}</p>
                )}
                {data.office_city && (
                  <p className="text-sm text-base-content/80">{data.office_city}</p>
                )}
              </div>
            )}

            {/* Messaging Links */}
            {(data.whatsapp || data.signal || data.telegram || data.sms_link) && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <h3 className="text-sm font-semibold mb-3 text-base-content/70">💬 Message</h3>
                <div className="flex flex-wrap gap-2">
                  {data.whatsapp && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.whatsapp.startsWith("http") ? data.whatsapp : `https://${data.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  )}
                  {data.signal && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.signal.startsWith("http") ? data.signal : `https://${data.signal}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Signal
                    </a>
                  )}
                  {data.telegram && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.telegram.startsWith("http") ? data.telegram : `https://${data.telegram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Telegram
                    </a>
                  )}
                  {data.sms_link && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.sms_link}
                    >
                      SMS
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Media / Content */}
            {(data.podcast_link || data.youtube_channel || data.sermon_series || data.featured_talk) && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <h3 className="text-sm font-semibold mb-3 text-base-content/70">🎧 Media & Content</h3>
                <div className="flex flex-wrap gap-2">
                  {data.podcast_link && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.podcast_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Podcast
                    </a>
                  )}
                  {data.youtube_channel && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.youtube_channel}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      YouTube Channel
                    </a>
                  )}
                  {data.sermon_series && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.sermon_series}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Sermon Series
                    </a>
                  )}
                  {data.featured_talk && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.featured_talk}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Featured Talk
                    </a>
                  )}
                </div>
              </div>
            )}

            {data.qr_code_url && data.show_qr_code !== false && (
              <div className="mt-6 pt-6 border-t border-base-300">
                <h3 className="text-sm font-semibold mb-3 text-base-content/70 text-center">Scan to Connect</h3>
                <div className="flex justify-center">
                  <div className="border-2 border-base-300 rounded-lg p-4 bg-base-200">
                    <img
                      src={data.qr_code_url}
                      alt="QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Social Media Links */}
            {(data.linkedin || data.twitter || data.instagram || data.facebook || data.tiktok || data.youtube || data.github) && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <h3 className="text-sm font-semibold mb-3 text-base-content/70">Social Media</h3>
                <div className="flex flex-wrap gap-2">
                  {data.linkedin && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.linkedin.startsWith("http") ? data.linkedin : `https://${data.linkedin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      LinkedIn
                    </a>
                  )}
                  {data.twitter && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.twitter.startsWith("http") ? data.twitter : `https://${data.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      Twitter/X
                    </a>
                  )}
                  {data.instagram && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.instagram.startsWith("http") ? data.instagram : `https://${data.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      Instagram
                    </a>
                  )}
                  {data.facebook && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.facebook.startsWith("http") ? data.facebook : `https://${data.facebook}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                      </svg>
                      Facebook
                    </a>
                  )}
                  {data.tiktok && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.tiktok.startsWith("http") ? data.tiktok : `https://${data.tiktok}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                      TikTok
                    </a>
                  )}
                  {data.youtube && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.youtube.startsWith("http") ? data.youtube : `https://${data.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      YouTube
                    </a>
                  )}
                  {data.github && (
                    <a 
                      className="btn btn-sm btn-outline" 
                      href={data.github.startsWith("http") ? data.github : `https://${data.github}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-sm text-base-content/60">
          Powered by <span className="font-semibold">Kardo</span>
        </div>
      </div>
    </main>
  );
}