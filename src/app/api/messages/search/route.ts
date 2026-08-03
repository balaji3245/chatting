import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    const results = await db.message.findMany({
      where: {
        conversationId: "default-private-chat",
        isDeleted: false,
        content: {
          contains: query,
          mode: "insensitive",
        },
      },
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        attachments: true,
      },
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[Search Messages API Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
