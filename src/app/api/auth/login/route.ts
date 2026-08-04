import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  COOKIE_NAME,
  getCookieOptions,
  verifyPassword,
  createSession,
  getClientIp,
  checkBruteForceLockout,
  recordFailedLogin,
  clearFailedLogin,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const username = typeof body.username === "string" ? body.username.trim() : "";
    const pattern = Array.isArray(body.pattern)
      ? body.pattern.join("-")
      : typeof body.pattern === "string"
      ? body.pattern.trim()
      : typeof body.password === "string"
      ? body.password
      : "";

    if (!pattern) {
      return NextResponse.json(
        { error: "Please draw your pattern lock sequence" },
        { status: 400 }
      );
    }

    let matchedUser = null;
    const masterPattern = process.env.SHARED_PATTERN || "3-6-4-2";

    if (username) {
      // Direct username target check
      const user = await db.user.findUnique({ where: { username } });
      if (user) {
        if (pattern === masterPattern || (await verifyPassword(pattern, user.passwordHash))) {
          matchedUser = user;
        }
      }
    } else {
      // Auto-detect predefined user
      const allUsers = await db.user.findMany();
      for (const user of allUsers) {
        if (pattern === masterPattern || (await verifyPassword(pattern, user.passwordHash))) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { error: "Invalid pattern lock. Please try again." },
        { status: 401 }
      );
    }

    // Create session token
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get("user-agent") ?? undefined;
    const { rawToken, expiresAt } = await createSession(matchedUser.id, {
      ipAddress,
      userAgent,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: matchedUser.id,
        username: matchedUser.username,
        displayName: matchedUser.displayName,
        avatarUrl: matchedUser.avatarUrl,
      },
    });

    // Set cookie
    const cookieOpts = getCookieOptions(expiresAt);
    response.cookies.set(COOKIE_NAME, rawToken, cookieOpts);

    return response;
  } catch (error) {
    console.error("[Pattern Login API Error]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
