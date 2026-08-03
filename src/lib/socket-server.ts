import { Server as SocketIOServer, Socket } from "socket.io";
import { Prisma } from "@prisma/client";
import { COOKIE_NAME, verifySessionToken } from "./auth";
import { SessionUser } from "../types/auth";
import { db } from "./db";
import { MessageStatusRank } from "../types/chat";

export interface AuthenticatedSocket extends Socket {
  user?: SessionUser;
}

// Global presence tracker: Map<userId, Set<socketId>>
const userSockets = new Map<string, Set<string>>();

/**
 * Helper to get message include structure for real-time payloads
 */
const messageIncludePayload = {
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
};

export function setupSocketAuth(io: SocketIOServer) {
  // 1. Handshake Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie ?? "";
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map((c) => {
          const [k, ...v] = c.split("=");
          return [k, v.join("=")];
        })
      );

      const rawToken = cookies[COOKIE_NAME];
      if (!rawToken) {
        return next(new Error("Authentication error: Missing session token"));
      }

      const user = await verifySessionToken(rawToken);
      if (!user) {
        return next(new Error("Authentication error: Invalid or expired session"));
      }

      socket.user = user;
      next();
    } catch (err) {
      console.error("[Socket Auth Error]", err);
      next(new Error("Authentication error: Handshake failed"));
    }
  });

  // 2. Connection and Event Handlers
  io.on("connection", async (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    const userId = user.id;

    // Track active socket connections for online presence
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join room for deterministic conversation
    socket.join("default-private-chat");

    // If first socket connection for this user, broadcast online status
    if (userSockets.get(userId)!.size === 1) {
      io.to("default-private-chat").emit("user:presence", {
        userId,
        isOnline: true,
        lastSeen: null,
      });
    }

    // Helper: Find recipient user (the other predefined account)
    const getRecipientUser = async () => {
      const user1Username = process.env.USER1_USERNAME || "t";
      const user2Username = process.env.USER2_USERNAME || "adesh";
      const peerUsername = user.username === user1Username ? user2Username : user1Username;
      return await db.user.findUnique({
        where: { username: peerUsername },
      });
    };

    // A. Send Message Handler (with clientMessageId Idempotency)
    socket.on("message:send", async (data, ackCallback) => {
      try {
        const { clientMessageId, content, type, replyToId, attachmentIds, attachmentFiles } = data;
        if (!clientMessageId) {
          if (ackCallback) ackCallback({ error: "Missing clientMessageId" });
          return;
        }

        const senderId = userId; // Strictly session-derived identity

        let fullMessage: any = null;

        try {
          // Find recipient user
          const recipient = await getRecipientUser();

          // Create message + initial SENT receipt for recipient
          fullMessage = await db.message.create({
            data: {
              conversationId: "default-private-chat",
              senderId,
              clientMessageId,
              replyToId: replyToId || null,
              type: type || "TEXT",
              content: content || null,
              receipts: recipient
                ? {
                    create: {
                      userId: recipient.id,
                      status: "SENT",
                    },
                  }
                : undefined,
            },
            include: messageIncludePayload,
          });

          // Link attachments if uploaded files were provided
          if (attachmentFiles && Array.isArray(attachmentFiles) && attachmentFiles.length > 0) {
            await db.attachment.createMany({
              data: attachmentFiles.map((att: any) => ({
                messageId: fullMessage.id,
                filename: att.filename,
                originalName: att.originalName,
                mimeType: att.mimeType,
                size: att.size,
                category: att.category,
                path: att.path,
                duration: att.duration || null,
              })),
            });

            // Refetch message with newly created attachments
            fullMessage = await db.message.findUnique({
              where: { id: fullMessage.id },
              include: messageIncludePayload,
            });
          }
        } catch (error: any) {
          // Catch Prisma P2002 unique constraint error for (senderId, clientMessageId) idempotency
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            fullMessage = await db.message.findUnique({
              where: {
                senderId_clientMessageId: { senderId, clientMessageId },
              },
              include: messageIncludePayload,
            });
          } else {
            throw error;
          }
        }

        if (fullMessage) {
          // Rolling window: keep only latest 30 messages, delete oldest beyond limit
          const MESSAGE_LIMIT = 30;
          const totalCount = await db.message.count({
            where: { conversationId: "default-private-chat" },
          });

          if (totalCount > MESSAGE_LIMIT) {
            const overflow = totalCount - MESSAGE_LIMIT;
            // Find oldest messages to delete
            const oldestMessages = await db.message.findMany({
              where: { conversationId: "default-private-chat" },
              orderBy: [{ createdAt: "asc" }, { id: "asc" }],
              take: overflow,
              select: { id: true },
            });

            const oldestIds = oldestMessages.map((m) => m.id);

            // First null out reply references in oldest messages to avoid P2014 self-referential constraint
            await db.message.updateMany({
              where: { id: { in: oldestIds }, replyToId: { not: null } },
              data: { replyToId: null },
            });
            // Also null out replyToId of newer messages that reply TO the oldest ones
            await db.message.updateMany({
              where: { replyToId: { in: oldestIds } },
              data: { replyToId: null },
            });
            // Cascade delete: receipts, reactions, attachments, then messages
            await db.messageReceipt.deleteMany({ where: { messageId: { in: oldestIds } } });
            await db.reaction.deleteMany({ where: { messageId: { in: oldestIds } } });
            await db.attachment.deleteMany({ where: { messageId: { in: oldestIds } } });
            await db.message.deleteMany({ where: { id: { in: oldestIds } } });

            // Notify all clients to remove old messages from UI
            io.to("default-private-chat").emit("messages:deleted", oldestIds);
          }

          // Broadcast new message to recipient(s) in conversation room
          socket.to("default-private-chat").emit("message:new", fullMessage);

          // Return ACK to sender socket
          if (ackCallback) ackCallback({ success: true, message: fullMessage });
        }
      } catch (err: any) {
        console.error("[Socket message:send Error]", err);
        if (ackCallback) ackCallback({ error: err.message || "Failed to send message" });
      }
    });

    // B. Clear Chat Handler (deletes all messages for both users)
    socket.on("chat:clear", async (_, ackCallback) => {
      try {
        // Get all message IDs in the conversation
        const allMessages = await db.message.findMany({
          where: { conversationId: "default-private-chat" },
          select: { id: true },
        });

        const allIds = allMessages.map((m) => m.id);

        if (allIds.length > 0) {
          // First null out reply references to avoid self-referential constraint (Prisma P2014)
          await db.message.updateMany({
            where: { conversationId: "default-private-chat", replyToId: { not: null } },
            data: { replyToId: null },
          });
          await db.messageReceipt.deleteMany({ where: { messageId: { in: allIds } } });
          await db.reaction.deleteMany({ where: { messageId: { in: allIds } } });
          await db.attachment.deleteMany({ where: { messageId: { in: allIds } } });
          await db.message.deleteMany({ where: { conversationId: "default-private-chat" } });
        }

        // Broadcast to ALL connected clients (including sender) to clear their UI
        io.to("default-private-chat").emit("chat:cleared");

        if (ackCallback) ackCallback({ success: true });
      } catch (err: any) {
        console.error("[Socket chat:clear Error]", err);
        if (ackCallback) ackCallback({ error: err.message || "Failed to clear chat" });
      }
    });

    // C. Delivery Acknowledgment Handler (SENT -> DELIVERED)
    socket.on("message:acknowledge_delivery", async ({ messageId }) => {
      try {
        if (!messageId) return;

        const receipt = await db.messageReceipt.findUnique({
          where: {
            messageId_userId: { messageId, userId },
          },
        });

        if (!receipt) {
          // Create receipt as DELIVERED if it doesn't exist
          await db.messageReceipt.create({
            data: { messageId, userId, status: "DELIVERED" },
          });
        } else if (MessageStatusRank[receipt.status] < MessageStatusRank.DELIVERED) {
          // Upgrade status monotonically
          await db.messageReceipt.update({
            where: { id: receipt.id },
            data: { status: "DELIVERED" },
          });
        }

        // Broadcast receipt status update
        io.to("default-private-chat").emit("message:receipt_updated", {
          messageId,
          userId,
          status: "DELIVERED",
        });
      } catch (err) {
        console.error("[Socket message:acknowledge_delivery Error]", err);
      }
    });

    // C. Read Acknowledgment Handler (DELIVERED -> READ)
    socket.on("message:read", async ({ messageIds }) => {
      try {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        const updatedIds: string[] = [];

        for (const messageId of messageIds) {
          const receipt = await db.messageReceipt.findUnique({
            where: { messageId_userId: { messageId, userId } },
          });

          if (!receipt) {
            await db.messageReceipt.create({
              data: { messageId, userId, status: "READ" },
            });
            updatedIds.push(messageId);
          } else if (MessageStatusRank[receipt.status] < MessageStatusRank.READ) {
            await db.messageReceipt.update({
              where: { id: receipt.id },
              data: { status: "READ" },
            });
            updatedIds.push(messageId);
          }
        }

        if (updatedIds.length > 0) {
          io.to("default-private-chat").emit("message:receipt_updated", {
            messageIds: updatedIds,
            userId,
            status: "READ",
          });
        }
      } catch (err) {
        console.error("[Socket message:read Error]", err);
      }
    });

    // D. Reconnection Cursor Sync Handler
    socket.on("message:sync", async ({ lastReceivedCreatedAt, lastReceivedId }, callback) => {
      try {
        const whereClause: any = {
          conversationId: "default-private-chat",
        };

        if (lastReceivedCreatedAt && lastReceivedId) {
          const cursorDate = new Date(lastReceivedCreatedAt);
          whereClause.OR = [
            { createdAt: { gt: cursorDate } },
            {
              createdAt: cursorDate,
              id: { gt: lastReceivedId },
            },
          ];
        }

        const missedMessages = await db.message.findMany({
          where: whereClause,
          orderBy: [
            { createdAt: "asc" },
            { id: "asc" },
          ],
          include: messageIncludePayload,
        });

        if (callback) {
          callback({ messages: missedMessages });
        } else {
          socket.emit("message:sync_response", { messages: missedMessages });
        }
      } catch (err: any) {
        console.error("[Socket message:sync Error]", err);
        if (callback) callback({ error: "Sync failed" });
      }
    });

    // E. Typing Indicators
    socket.on("typing:start", () => {
      socket.to("default-private-chat").emit("typing:state", { userId, isTyping: true });
    });

    socket.on("typing:stop", () => {
      socket.to("default-private-chat").emit("typing:state", { userId, isTyping: false });
    });

    // F. Edit Message (Author Only)
    socket.on("message:edit", async ({ messageId, content }, ackCallback) => {
      try {
        const existing = await db.message.findUnique({ where: { id: messageId } });
        if (!existing || existing.senderId !== userId) {
          if (ackCallback) ackCallback({ error: "Unauthorized to edit message" });
          return;
        }

        const updated = await db.message.update({
          where: { id: messageId },
          data: {
            content,
            isEdited: true,
          },
          include: messageIncludePayload,
        });

        io.to("default-private-chat").emit("message:edited", updated);
        if (ackCallback) ackCallback({ success: true, message: updated });
      } catch (err: any) {
        console.error("[Socket message:edit Error]", err);
        if (ackCallback) ackCallback({ error: "Failed to edit message" });
      }
    });

    // G. Delete Message (Author Only Soft Delete)
    socket.on("message:delete", async ({ messageId }, ackCallback) => {
      try {
        const existing = await db.message.findUnique({ where: { id: messageId } });
        if (!existing || existing.senderId !== userId) {
          if (ackCallback) ackCallback({ error: "Unauthorized to delete message" });
          return;
        }

        const deleted = await db.message.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
          },
          include: messageIncludePayload,
        });

        io.to("default-private-chat").emit("message:deleted", deleted);
        if (ackCallback) ackCallback({ success: true, message: deleted });
      } catch (err: any) {
        console.error("[Socket message:delete Error]", err);
        if (ackCallback) ackCallback({ error: "Failed to delete message" });
      }
    });

    // H. Reactions Handler
    socket.on("reaction:toggle", async ({ messageId, emoji }) => {
      try {
        if (!messageId || !emoji) return;

        const existing = await db.reaction.findUnique({
          where: {
            messageId_userId_emoji: { messageId, userId, emoji },
          },
        });

        if (existing) {
          await db.reaction.delete({ where: { id: existing.id } });
        } else {
          await db.reaction.create({
            data: { messageId, userId, emoji },
          });
        }

        // Fetch updated message reactions
        const updatedReactions = await db.reaction.findMany({
          where: { messageId },
          include: {
            user: {
              select: { id: true, username: true, displayName: true },
            },
          },
        });

        io.to("default-private-chat").emit("reaction:updated", {
          messageId,
          reactions: updatedReactions,
        });
      } catch (err) {
        console.error("[Socket reaction:toggle Error]", err);
      }
    });

    // I. Disconnect & Presence Cleanup
    socket.on("disconnect", async () => {
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);

        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
          const lastSeen = new Date();

          await db.user.update({
            where: { id: userId },
            data: { lastSeen },
          }).catch(() => {});

          io.to("default-private-chat").emit("user:presence", {
            userId,
            isOnline: false,
            lastSeen: lastSeen.toISOString(),
          });
        }
      }
    });
  });
}

/**
 * Returns current online status for a given user ID
 */
export function isUserOnline(userId: string): boolean {
  return (userSockets.get(userId)?.size ?? 0) > 0;
}
