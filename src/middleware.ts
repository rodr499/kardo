import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Match: /u/<handle>.vcf
  const match = pathname.match(/^\/u\/([^\/]+)\.vcf$/);
  if (match) {
    const handle = match[1];
    const url = req.nextUrl.clone();
    url.pathname = `/u/${handle}/vcf`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/u/:path*"],
};
