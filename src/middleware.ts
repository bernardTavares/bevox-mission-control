import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAllowedAccessUser, getAllowlistFromEnv } from "@/lib/bevox/auth";

// API routes that are always public.
// /api/health: Cloudflare can ping this for tunnel health checks (no Access JWT).
const PUBLIC_API_PREFIXES = ["/api/health"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public API routes (Cloudflare health checks).
  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Trust Cloudflare Access header. The Cf-Access-Authenticated-User-Email
  // header is injected at the edge after Access authenticates the user via
  // its configured identity provider (Google SSO, OTP, etc.). If the header
  // is missing, the request did not come through Access.
  const allowlist = getAllowlistFromEnv();
  if (!isAllowedAccessUser(request.headers, allowlist)) {
    // For API routes: return 403 JSON.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "Cloudflare Access required",
        },
        { status: 403 },
      );
    }
    // For page routes: plain 403 (no redirect, since there is no app-level
    // login page anymore — Cloudflare Access handles its own login at the edge).
    return new NextResponse("Forbidden: Cloudflare Access required", {
      status: 403,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (with extension)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
