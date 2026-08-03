import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-chat_session" : "chat_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(COOKIE_NAME);

  // If visiting login page while having a session cookie, redirect to chat home
  if (pathname === "/login" && hasSessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // If visiting protected root page without a session cookie, redirect to login
  if (pathname === "/" && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login"],
};
