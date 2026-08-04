import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "chat_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(COOKIE_NAME);

  // If visiting protected root page without a session cookie, redirect to login
  if (pathname === "/" && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
