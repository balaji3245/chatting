"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { connectSocket, getSocket } from "@/lib/socket-client";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { MediaPreviewModal } from "./MediaPreviewModal";
import { SearchModal } from "./SearchModal";
import { ChatUser } from "@/types/chat";
import { MessageType } from "@prisma/client";

interface ChatAppClientProps {
  currentUser: { id: string; username: string; displayName: string; avatarUrl: string | null };
  peerUser: ChatUser | null;
  initialMessages: any[];
  initialNextCursor: { createdAt: string; id: string } | null;
}

export const ChatAppClient: React.FC<ChatAppClientProps> = ({
  currentUser,
  peerUser: initialPeerUser,
  initialMessages,
  initialNextCursor,
}) => {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>(initialMessages);
  const [peerUser, setPeerUser] = useState<ChatUser | null>(initialPeerUser);
  const [isPeerOnline, setIsPeerOnline] = useState<boolean>(false);
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);

  const [nextCursor, setNextCursor] = useState<{ createdAt: string; id: string } | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const [replyingMessage, setReplyingMessage] = useState<any | null>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);

  const [searchModalOpen, setSearchModalOpen] = useState<boolean>(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; category: MessageType } | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const lastReceivedCursorRef = useRef<{ createdAt: string; id: string } | null>(null);
  // Flag to suppress logout when native file picker is open (visibility goes hidden briefly)
  const isFilePickerOpenRef = useRef<boolean>(false);

  // Keep track of latest message cursor for reconnection sync
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      lastReceivedCursorRef.current = {
        createdAt: new Date(lastMsg.createdAt).toISOString(),
        id: lastMsg.id,
      };
    }
  }, [messages]);

  // Request Notification Permissions
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // 1. Socket Setup & Event Binding
  useEffect(() => {
    const socket = connectSocket();

    const doSync = () => {
      if (!socket.connected) return;
      if (lastReceivedCursorRef.current) {
        socket.emit(
          "message:sync",
          {
            lastReceivedCreatedAt: lastReceivedCursorRef.current.createdAt,
            lastReceivedId: lastReceivedCursorRef.current.id,
          },
          (res: any) => {
            if (res && res.messages && res.messages.length > 0) {
              setMessages((prev) => {
                const existingIds = new Set(prev.map((m) => m.id));
                const newMsgs = res.messages.filter((m: any) => !existingIds.has(m.id));
                return [...prev, ...newMsgs];
              });
            }
          }
        );
      }
    };

    const handleConnect = () => {
      setIsConnected(true);
      doSync();
    };

    // Force logout on any disconnect — security: any offline moment requires re-login
    const forceLogout = async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch (_) {
        // Best-effort logout even if network is down
      }
      router.push("/login");
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      forceLogout();
    };

    const handleConnectError = () => {
      setIsConnected(false);
      forceLogout();
    };

    const handleNewMessage = (newMsg: any) => {
      setMessages((prev) => {
        // Prevent duplicate append
        if (prev.some((m) => m.id === newMsg.id || m.clientMessageId === newMsg.clientMessageId)) {
          return prev;
        }
        return [...prev, newMsg];
      });

      // Recipient Delivery Acknowledgment
      if (newMsg.senderId !== currentUser.id) {
        socket.emit("message:acknowledge_delivery", { messageId: newMsg.id });

        // Trigger Browser Notification if window unfocused
        if (document.hidden && Notification.permission === "granted") {
          new Notification(newMsg.sender.displayName || "New Message", {
            body: newMsg.content || `Sent an attachment [${newMsg.type}]`,
            icon: newMsg.sender.avatarUrl || undefined,
          });
        }
      }
    };

    const handleReceiptUpdated = (data: { messageId?: string; messageIds?: string[]; userId: string; status: any }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          const isTarget = data.messageIds ? data.messageIds.includes(msg.id) : msg.id === data.messageId;
          if (isTarget) {
            const receipts = msg.receipts || [];
            const existingIdx = receipts.findIndex((r: any) => r.userId === data.userId);
            let updatedReceipts = [...receipts];
            if (existingIdx >= 0) {
              updatedReceipts[existingIdx] = { ...updatedReceipts[existingIdx], status: data.status };
            } else {
              updatedReceipts.push({ userId: data.userId, status: data.status });
            }
            return { ...msg, receipts: updatedReceipts };
          }
          return msg;
        })
      );
    };

    const handleMessageEdited = (editedMsg: any) => {
      setMessages((prev) => prev.map((m) => (m.id === editedMsg.id ? editedMsg : m)));
    };

    const handleMessageDeleted = (deletedMsg: any) => {
      setMessages((prev) => prev.map((m) => (m.id === deletedMsg.id ? deletedMsg : m)));
    };

    // Bulk deletion handler for rolling 30-msg window cleanup
    const handleMessagesDeleted = (deletedIds: string[]) => {
      setMessages((prev) => prev.filter((m) => !deletedIds.includes(m.id)));
    };

    // Clear all chat messages from UI (triggered by chat:clear from either user)
    const handleChatCleared = () => {
      setMessages([]);
    };

    const handleReactionUpdated = ({ messageId, reactions }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, reactions } : m))
      );
    };

    const handlePresence = ({ userId, isOnline, lastSeen }: any) => {
      if (peerUser && userId === peerUser.id) {
        setIsPeerOnline(isOnline);
        setPeerUser((prev) => (prev ? { ...prev, lastSeen: lastSeen ? new Date(lastSeen) : null } : null));
      }
    };

    const handleTypingState = ({ userId, isTyping }: any) => {
      if (peerUser && userId === peerUser.id) {
        setIsPeerTyping(isTyping);
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("message:new", handleNewMessage);
    socket.on("message:receipt_updated", handleReceiptUpdated);
    socket.on("message:edited", handleMessageEdited);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("messages:deleted", handleMessagesDeleted);
    socket.on("chat:cleared", handleChatCleared);
    socket.on("reaction:updated", handleReactionUpdated);
    socket.on("user:presence", handlePresence);
    socket.on("typing:state", handleTypingState);

    // Force logout when user leaves the tab/browser — but NOT when file picker is open
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !isFilePickerOpenRef.current) {
        forceLogout();
      }
    };

    // File picker open/close events from MessageComposer
    const handleFilePickerOpen = () => { isFilePickerOpenRef.current = true; };
    const handleFilePickerClose = () => {
      // Small delay so visibilitychange fires first, then reset flag
      setTimeout(() => { isFilePickerOpenRef.current = false; }, 2000);
    };

    window.addEventListener("filepicker:open", handleFilePickerOpen);
    window.addEventListener("filepicker:close", handleFilePickerClose);

    // Force logout on network offline
    const handleOffline = () => {
      forceLogout();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("offline", handleOffline);

    // Set initial connection state
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("message:new", handleNewMessage);
      socket.off("message:receipt_updated", handleReceiptUpdated);
      socket.off("message:edited", handleMessageEdited);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("messages:deleted", handleMessagesDeleted);
      socket.off("chat:cleared", handleChatCleared);
      socket.off("reaction:updated", handleReactionUpdated);
      socket.off("user:presence", handlePresence);
      socket.off("typing:state", handleTypingState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("filepicker:open", handleFilePickerOpen);
      window.removeEventListener("filepicker:close", handleFilePickerClose);
    };
  }, [currentUser.id, peerUser]);

  // 2. Automatically mark unread peer messages as READ when viewed
  useEffect(() => {
    const unreadPeerMessageIds = messages
      .filter((m) => m.senderId !== currentUser.id && !m.isDeleted)
      .filter((m) => {
        const myReceipt = m.receipts?.find((r: any) => r.userId === currentUser.id);
        return !myReceipt || myReceipt.status !== "READ";
      })
      .map((m) => m.id);

    if (unreadPeerMessageIds.length > 0) {
      const socket = getSocket();
      socket.emit("message:read", { messageIds: unreadPeerMessageIds });
    }
  }, [messages, currentUser.id]);

  // 3. Load Earlier Messages (Cursor Pagination)
  const handleLoadMore = useCallback(async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const url = `/api/messages?cursorCreatedAt=${encodeURIComponent(nextCursor.createdAt)}&cursorId=${encodeURIComponent(nextCursor.id)}&limit=30`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => [...data.messages, ...prev]);
        setNextCursor(data.nextCursor);
      } else {
        setNextCursor(null);
      }
    } catch (err) {
      console.error("[Load More Messages Error]", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor, isLoadingMore]);

  // 4. Send Message Handler
  const handleSendMessage = useCallback(
    ({ content, type, replyToId, attachmentFiles }: any) => {
      const socket = getSocket();
      // crypto.randomUUID() only works on HTTPS — use fallback for HTTP local network
      const clientMessageId =
        typeof crypto?.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

      // Optimistic message append
      const optimisticMsg = {
        id: clientMessageId,
        senderId: currentUser.id,
        clientMessageId,
        replyToId: replyToId || null,
        type: type || "TEXT",
        content: content || null,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        sender: currentUser,
        replyTo: replyingMessage ? {
          id: replyingMessage.id,
          content: replyingMessage.content,
          type: replyingMessage.type,
          isDeleted: replyingMessage.isDeleted,
          sender: { displayName: replyingMessage.sender.displayName },
        } : null,
        attachments: attachmentFiles || [],
        reactions: [],
        receipts: peerUser ? [{ userId: peerUser.id, status: "SENT" }] : [],
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      // Emit to server
      socket.emit(
        "message:send",
        {
          clientMessageId,
          content,
          type,
          replyToId,
          attachmentFiles,
        },
        (response: any) => {
          if (response && response.success && response.message) {
            // Replace optimistic message with server-confirmed message
            setMessages((prev) =>
              prev.map((m) =>
                m.clientMessageId === clientMessageId ? response.message : m
              )
            );
          }
        }
      );
    },
    [currentUser, peerUser, replyingMessage]
  );

  // 5. Typing Handlers
  const handleTypingStart = () => {
    getSocket().emit("typing:start");
  };

  const handleTypingStop = () => {
    getSocket().emit("typing:stop");
  };

  // 6. Action Handlers: Edit, Delete, Reactions
  const handleSaveEdit = (messageId: string, newContent: string) => {
    getSocket().emit("message:edit", { messageId, content: newContent });
  };

  const handleDeleteMessage = (messageId: string) => {
    if (confirm("Are you sure you want to delete this message?")) {
      getSocket().emit("message:delete", { messageId });
    }
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    getSocket().emit("reaction:toggle", { messageId, emoji });
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleSelectSearchResult = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-indigo-500", "rounded-2xl", "transition-all");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-indigo-500", "rounded-2xl");
      }, 2500);
    }
  };

  const handleClearChat = () => {
    const socket = getSocket();
    socket.emit("chat:clear");
  };

  const handleEmergencyExit = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (_) {}
    if (typeof window !== "undefined") {
      try {
        sessionStorage.clear();
        localStorage.clear();
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
      } catch (_) {}

      // Overwrite history entries so pressing Back button stays on Google
      try {
        window.history.pushState(null, "", "https://www.google.com");
        window.history.replaceState(null, "", "https://www.google.com");
      } catch (_) {}

      window.close();
      window.location.replace("https://www.google.com");
    }
  };

  return (
    <div
      className="flex flex-col bg-white text-slate-900 font-sans"
      style={{ position: "fixed", inset: 0, overflow: "hidden" }}
    >
      {/* Header - always fixed at top, never scrolls */}
      <div className="flex-shrink-0">
        <ChatHeader
          peerUser={peerUser}
          isPeerOnline={isPeerOnline}
          currentUser={currentUser}
          onOpenSearch={() => setSearchModalOpen(true)}
          onLogout={handleLogout}
          onClearChat={handleClearChat}
          isConnected={isConnected}
        />
      </div>

      {/* Main Messages Thread - fills remaining height, scrolls internally */}
      <div className="flex-1 min-h-0">
        <MessageList
          messages={messages}
          currentUserId={currentUser.id}
          peerUser={peerUser}
          isPeerTyping={isPeerTyping}
          hasMore={Boolean(nextCursor)}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          onReply={(msg) => setReplyingMessage(msg)}
          onEdit={(msg) => setEditingMessage(msg)}
          onDelete={handleDeleteMessage}
          onToggleReaction={handleToggleReaction}
          onOpenMedia={(url, cat) => setMediaPreview({ url, category: cat })}
        />
      </div>

      {/* Floating Emergency Panic Exit Button */}
      <button
        onClick={handleEmergencyExit}
        title="Panic Exit (Instant Leave & Logout)"
        className="fixed bottom-[76px] left-3 z-40 px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-lg border border-rose-500/40 flex items-center gap-1.5 transition-all active:scale-95 animate-in fade-in"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span>Exit</span>
      </button>

      {/* Input Composer - always fixed at bottom, never scrolls */}
      <div className="flex-shrink-0">
        <MessageComposer
          onSendMessage={handleSendMessage}
          replyingMessage={replyingMessage}
          onCancelReply={() => setReplyingMessage(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
          onSaveEdit={handleSaveEdit}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
        />
      </div>

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectMessage={handleSelectSearchResult}
      />

      {/* Media Lightbox Modal */}
      <MediaPreviewModal
        mediaUrl={mediaPreview?.url || null}
        category={mediaPreview?.category || null}
        onClose={() => setMediaPreview(null)}
      />
    </div>
  );
};
