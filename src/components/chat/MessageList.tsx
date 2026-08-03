import React, { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { MessageType } from "@prisma/client";

interface MessageListProps {
  messages: any[];
  currentUserId: string;
  peerUser: { displayName: string } | null;
  isPeerTyping: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onReply: (msg: any) => void;
  onEdit: (msg: any) => void;
  onDelete: (msgId: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onOpenMedia: (url: string, category: MessageType) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  peerUser,
  isPeerTyping,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onOpenMedia,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef<boolean>(true);

  // Handle auto-scroll to bottom on new messages
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isPeerTyping]);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;

    // Check if scrolled near bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 150;

    // Infinite scroll load more when scrolling near top
    if (scrollTop < 50 && hasMore && !isLoadingMore) {
      onLoadMore();
    }
  };

  const formatDateHeader = (dateStr: string | Date) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

    return d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4 bg-[#f0f2f5]"
    >
      {/* Load More Spinner */}
      {hasMore && (
        <div className="flex justify-center py-2">
          {isLoadingMore ? (
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <button
              onClick={onLoadMore}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs"
            >
              Load earlier messages
            </button>
          )}
        </div>
      )}

      {/* Render Messages with Date Section Headers */}
      {messages.map((msg, index) => {
        const currentDateStr = new Date(msg.createdAt).toDateString();
        const prevDateStr =
          index > 0 ? new Date(messages[index - 1].createdAt).toDateString() : null;

        const showDateHeader = currentDateStr !== prevDateStr;

        return (
          <React.Fragment key={msg.id || msg.clientMessageId}>
            {showDateHeader && (
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 rounded-full bg-white border border-slate-200/90 text-[11px] font-medium text-slate-500 select-none shadow-xs" suppressHydrationWarning>
                  {formatDateHeader(msg.createdAt)}
                </span>
              </div>
            )}

            <div id={`msg-${msg.id}`}>
              <MessageBubble
                message={msg}
                currentUserId={currentUserId}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleReaction={onToggleReaction}
                onOpenMedia={onOpenMedia}
              />
            </div>
          </React.Fragment>
        );
      })}

      {/* Typing Indicator */}
      {isPeerTyping && <TypingIndicator displayName={peerUser?.displayName} />}

      <div ref={bottomRef} />
    </div>
  );
};
