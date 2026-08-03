import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { ChatAppClient } from "@/components/chat/ChatAppClient";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  const currentUser = token ? await verifySessionToken(token) : null;

  if (!currentUser) {
    redirect("/login");
  }

  // Determine the peer username in this 2-person system
  const user1Username = process.env.USER1_USERNAME || "t";
  const user2Username = process.env.USER2_USERNAME || "adesh";
  const peerUsername = currentUser.username === user1Username ? user2Username : user1Username;

  const peerUser = await db.user.findUnique({
    where: { username: peerUsername },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      lastSeen: true,
    },
  });

  // Fetch initial messages with rich relations
  const limit = 30;
  const rawMessages = await db.message.findMany({
    where: {
      conversationId: "default-private-chat",
    },
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

  let initialNextCursor = null;
  if (rawMessages.length > limit) {
    const nextItem = rawMessages.pop();
    if (nextItem) {
      initialNextCursor = {
        createdAt: nextItem.createdAt.toISOString(),
        id: nextItem.id,
      };
    }
  }

  // Convert dates to ISO strings for client props serialization
  const initialMessages = rawMessages.reverse().map((msg) => ({
    ...msg,
    createdAt: msg.createdAt.toISOString(),
    updatedAt: msg.updatedAt.toISOString(),
    attachments: msg.attachments.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
    reactions: msg.reactions.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
    receipts: msg.receipts.map((rc) => ({
      ...rc,
      updatedAt: rc.updatedAt.toISOString(),
    })),
  }));

  return (
    <ChatAppClient
      currentUser={currentUser}
      peerUser={peerUser}
      initialMessages={initialMessages}
      initialNextCursor={initialNextCursor}
    />
  );
}
