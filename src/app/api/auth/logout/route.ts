import { NextResponse } from "next/server";
import { COOKIE_NAME, revokeSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [k, ...v] = c.split("=");
        return [k, v.join("=")];
      })
    );

    const rawToken = cookies[COOKIE_NAME];
    if (rawToken) {
      await revokeSession(rawToken);
    }

    const response = NextResponse.json({ success: true });
    // Clear session cookie
    response.cookies.set(COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("[Logout API Error]", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during logout." },
      { status: 500 }
    );
  }
}
