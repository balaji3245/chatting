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
    const cursorCreatedAt = searchParams.get("cursorCreatedAt");
    const cursorId = searchParams.get("cursorId");
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    const where: any = {
      conversationId: "default-private-chat",
    };

    if (cursorCreatedAt && cursorId) {
      const cursorDate = new Date(cursorCreatedAt);
      where.OR = [
        { createdAt: { lt: cursorDate } },
        {
          createdAt: cursorDate,
          id: { lt: cursorId },
        },
      ];
    }

    const rawMessages = await db.message.findMany({
      where,
      take: limit + 1,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true,
            isDeleted: true,
            type: true,
            sender: {
              select: {
                displayName: true,
              },
            },
          },
        },
        attachments: true,
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
        receipts: true,
      },
    });

    let nextCursor = null;
    if (rawMessages.length > limit) {
      const nextItem = rawMessages.pop(); // Remove extra item
      if (nextItem) {
        nextCursor = {
          createdAt: nextItem.createdAt.toISOString(),
          id: nextItem.id,
        };
      }
    }

    // Return messages ordered chronologically for frontend rendering
    const messages = rawMessages.reverse();

    return NextResponse.json({
      messages,
      nextCursor,
      currentUser: user,
    });
  } catch (error) {
    console.error("[GET Messages API Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
