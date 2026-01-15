import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // Match: /u/<handle>.vcf
  const match = pathname.match(/^\/u\/([^\/]+)\.vcf$/);
  if (match) {
    const handle = match[1];
    const url = req.nextUrl.clone();
    url.pathname = `/u/${handle}/vcf`;
    return NextResponse.rewrite(url);
  }

  // Handle Supabase auth cookie refresh
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    "/u/:path*",
    "/auth/:path*",
    "/login",
    "/claim",
    "/profile",
    "/c/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
