import { NextResponse } from "next/server";
import {
  getClientIp,
  checkBruteForceLockout,
  recordFailedLogin,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { valid: false, error: "Invalid request payload" },
        { status: 400 }
      );
    }

    const pattern = Array.isArray(body.pattern)
      ? body.pattern.join("-")
      : typeof body.pattern === "string"
      ? body.pattern.trim()
      : "";

    if (!pattern) {
      return NextResponse.json(
        { valid: false, error: "Please draw your pattern lock sequence" },
        { status: 400 }
      );
    }

    const ipAddress = getClientIp(request);

    // Rate limiting check
    const lockout = await checkBruteForceLockout(ipAddress, "pattern-verify");
    if (lockout.isLocked) {
      return NextResponse.json(
        {
          valid: false,
          error: `Too many failed attempts. Try again in ${lockout.remainingSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    // Fast master pattern comparison only — no bcrypt, instant < 1ms
    const masterPattern = process.env.SHARED_PATTERN || "3-6-4-2";
    const isValid = pattern === masterPattern;

    if (!isValid) {
      await recordFailedLogin(ipAddress, "pattern-verify");
      return NextResponse.json(
        { valid: false, error: "Invalid pattern lock. Please try again." },
        { status: 401 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("[Verify Pattern API Error]", error);
    return NextResponse.json(
      { valid: false, error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
