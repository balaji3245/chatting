import React, { useState, useRef } from "react";
import { MessageStatus, MessageType } from "@prisma/client";
import { Avatar } from "@/components/ui/Avatar";
import { MessageStatusRank } from "@/types/chat";

interface AttachmentItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: MessageType;
  path: string;
}

interface ReactionItem {
  id: string;
  emoji: string;
  userId: string;
  user: { id: string; displayName: string };
}

interface MessageBubbleProps {
  message: {
    id: string;
    senderId: string;
    clientMessageId: string;
    replyToId?: string | null;
    type: MessageType;
    content?: string | null;
    isEdited: boolean;
    isDeleted: boolean;
    createdAt: string | Date;
    sender: { id: string; displayName: string; avatarUrl?: string | null };
    replyTo?: { id: string; content?: string | null; type: MessageType; isDeleted: boolean; sender: { displayName: string } } | null;
    attachments?: AttachmentItem[];
    reactions?: ReactionItem[];
    receipts?: { userId: string; status: MessageStatus }[];
  };
  currentUserId: string;
  onReply: (msg: any) => void;
  onEdit: (msg: any) => void;
  onDelete: (msgId: string) => void;
  onToggleReaction: (msgId: string, emoji: string) => void;
  onOpenMedia: (mediaUrl: string, category: MessageType) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onToggleReaction,
  onOpenMedia,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long press handler for mobile action bar trigger
  const handleTouchStart = () => {
    if (message.isDeleted) return;
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchMove = () => {
    // Cancel long press if finger moves (scrolling)
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const isMine = message.senderId === currentUserId;
  const createdAtDate = new Date(message.createdAt);
  const timeFormatted = createdAtDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // Receipt resolution for sender
  let receiptStatus: MessageStatus = "SENT";
  if (message.receipts && message.receipts.length > 0) {
    // Find receipt for the recipient (other user)
    const recipientReceipt = message.receipts.find((r) => r.userId !== currentUserId);
    if (recipientReceipt) {
      receiptStatus = recipientReceipt.status;
    }
  }

  // Quick Emoji reactions list
  const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

  // Group reactions
  const groupedReactions = (message.reactions || []).reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, hasMine: false, users: [] };
    }
    acc[r.emoji].count += 1;
    acc[r.emoji].users.push(r.user?.displayName || "User");
    if (r.userId === currentUserId) {
      acc[r.emoji].hasMine = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasMine: boolean; users: string[] }>);

  // Render checkmark receipts
  const renderReceiptIcon = () => {
    const rank = MessageStatusRank[receiptStatus];

    if (rank === 3) {
      // READ (Blue double check)
      return (
        <span className="text-sky-300 flex items-center -space-x-1" title="Read">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    }
    if (rank === 2) {
      // DELIVERED (Grey double check)
      return (
        <span className="text-indigo-200 flex items-center -space-x-1" title="Delivered">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    }
    // SENT (Single check)
    return (
      <span className="text-indigo-200" title="Sent">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  };

  return (
    <div
      className={`group relative flex items-end gap-2 my-1 ${
        isMine ? "flex-row-reverse" : "flex-row"
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {!isMine && <Avatar name={message.sender.displayName} url={message.sender.avatarUrl} size="sm" />}

      <div className={`relative max-w-[80%] sm:max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        {/* Reply Preview Header */}
        {message.replyTo && (
          <div
            className={`mb-1 px-3 py-1.5 rounded-2xl text-xs border-l-3 ${
              isMine
                ? "bg-purple-800/40 border-white text-white"
                : "bg-slate-200/80 border-purple-600 text-slate-800"
            } w-full truncate cursor-pointer shadow-2xs`}
          >
            <span className="font-semibold block text-[11px] opacity-90">
              Replying to {message.replyTo.sender?.displayName || "User"}
            </span>
            <span className="italic opacity-80 truncate block">
              {message.replyTo.isDeleted
                ? "Deleted message"
                : message.replyTo.content || `[${message.replyTo.type}]`}
            </span>
          </div>
        )}

        {/* Message Bubble Container (Instagram DM Pill) */}
        <div
          className={`relative rounded-[22px] px-3.5 py-2 shadow-2xs ${
            isMine
              ? "bg-gradient-to-tr from-[#7000ff] via-[#a000ff] to-[#0095f6] text-white rounded-br-[4px]"
              : "bg-[#efefef] text-slate-900 rounded-bl-[4px]"
          }`}
        >
          {/* Soft Deleted Message View */}
          {message.isDeleted ? (
            <p className="text-xs italic opacity-75 flex items-center gap-1.5 py-0.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              This message was deleted
            </p>
          ) : (
            <>
              {/* Attachments rendering */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="space-y-2 mb-1.5">
                  {message.attachments.map((att) => {
                    const mediaUrl = `/api/media/${att.path}`;
                    if (att.category === "IMAGE") {
                      return (
                        <div
                          key={att.id}
                          onClick={() => onOpenMedia(mediaUrl, "IMAGE")}
                          className="relative rounded-2xl overflow-hidden cursor-pointer max-w-xs group/img border border-black/5"
                        >
                          <img
                            src={mediaUrl}
                            alt={att.originalName}
                            className="w-full max-h-60 object-cover group-hover/img:scale-105 transition-transform duration-200"
                          />
                        </div>
                      );
                    }
                    if (att.category === "VIDEO") {
                      return (
                        <div key={att.id} className="max-w-xs rounded-2xl overflow-hidden border border-black/5">
                          <video src={mediaUrl} controls className="w-full max-h-60 rounded-2xl" />
                        </div>
                      );
                    }
                    if (att.category === "AUDIO" || att.category === "VOICE") {
                      return (
                        <div key={att.id} className="py-1">
                          <audio src={mediaUrl} controls className="max-w-xs h-10 rounded-xl" />
                        </div>
                      );
                    }
                    // Document fallback
                    return (
                      <a
                        key={att.id}
                        href={mediaUrl}
                        download={att.originalName}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-3 p-2 rounded-xl border text-xs transition-colors ${
                          isMine
                            ? "bg-white/20 border-white/30 hover:bg-white/30 text-white"
                            : "bg-slate-200/60 border-slate-300 hover:bg-slate-200 text-slate-800"
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${isMine ? "bg-white/20 text-white" : "bg-purple-100 text-purple-600"}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium truncate">{att.originalName}</p>
                          <p className={`text-[10px] ${isMine ? "text-purple-100" : "text-slate-500"}`}>
                            {(att.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Message Text Content */}
              {message.content && (
                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed font-normal">
                  {message.content}
                </p>
              )}
            </>
          )}

          {/* Footer (Edited / Receipt) */}
          {(message.isEdited || (isMine && !message.isDeleted)) && (
            <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] select-none ${isMine ? "text-purple-100/90" : "text-slate-400"}`}>
              {message.isEdited && !message.isDeleted && <span>(edited)</span>}
              {isMine && !message.isDeleted && renderReceiptIcon()}
            </div>
          )}
        </div>

        {/* Reaction Badges */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, meta]) => (
              <button
                key={emoji}
                onClick={() => onToggleReaction(message.id, emoji)}
                title={meta.users.join(", ")}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${
                  meta.hasMine
                    ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs font-semibold"
                    : "bg-white border-slate-200 text-slate-700 shadow-xs"
                }`}
              >
                <span>{emoji}</span>
                <span className="font-semibold text-[10px]">{meta.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Floating Quick Actions Bar (on Hover/Touch) */}
        {showActions && !message.isDeleted && (
          <div
            className={`absolute top-0 -translate-y-1/2 flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 shadow-lg z-20 animate-in fade-in zoom-in-95 duration-100 ${
              isMine ? "right-2" : "left-2"
            }`}
          >
            {/* Emoji Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add Reaction"
                className="p-1 rounded-lg text-slate-500 hover:text-amber-500 hover:bg-slate-100 transition-colors"
              >
                😀
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 flex items-center gap-1.5 p-1.5 rounded-xl bg-white border border-slate-200 shadow-xl z-30">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => {
                        onToggleReaction(message.id, e);
                        setShowEmojiPicker(false);
                      }}
                      className="p-1 hover:scale-125 transition-transform"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reply Button */}
            <button
              onClick={() => onReply(message)}
              title="Reply"
              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>

            {/* Edit Button (Author only) */}
            {isMine && (
              <button
                onClick={() => onEdit(message)}
                title="Edit Message"
                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}

            {/* Delete Button (Author only) */}
            {isMine && (
              <button
                onClick={() => onDelete(message.id)}
                title="Delete Message"
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
