import { NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [k, ...v] = c.split("=");
        return [k, v.join("=")];
      })
    );

    const rawToken = cookies[COOKIE_NAME];
    if (!rawToken) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const user = await verifySessionToken(rawToken);
    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[Me API Error]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
