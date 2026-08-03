import React, { useState } from "react";
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
    acc[r.emoji].users.push(r.user.displayName);
    if (r.userId === currentUserId) {
      acc[r.emoji].hasMine = true;
    }
    return acc;
  }, {} as Record<string, { count: number; hasMine: boolean; users: string[] }>);

  const renderReceiptIcon = () => {
    const rank = MessageStatusRank[receiptStatus];
    if (rank === 3) {
      // READ (Blue double check)
      return (
        <span className="text-sky-400 font-bold flex items-center -space-x-1" title="Read">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      );
    }
    if (rank === 2) {
      // DELIVERED (Grey double check)
      return (
        <span className="text-gray-400 flex items-center -space-x-1" title="Delivered">
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
      <span className="text-gray-400" title="Sent">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  };

  return (
    <div
      className={`group relative flex items-start gap-2.5 my-2 ${
        isMine ? "flex-row-reverse" : "flex-row"
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowEmojiPicker(false);
      }}
    >
      {!isMine && <Avatar name={message.sender.displayName} url={message.sender.avatarUrl} size="sm" />}

      <div className={`relative max-w-[85%] sm:max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
        {/* Reply Preview Header */}
        {message.replyTo && (
          <div
            className={`mb-1 p-2 rounded-xl text-xs border-l-2 ${
              isMine
                ? "bg-indigo-950/40 border-indigo-400 text-indigo-200"
                : "bg-gray-800/80 border-gray-500 text-gray-300"
            } w-full truncate cursor-pointer`}
          >
            <span className="font-semibold block text-[11px] opacity-90">
              Replying to {message.replyTo.sender?.displayName || "User"}
            </span>
            <span className="italic opacity-80">
              {message.replyTo.isDeleted
                ? "Deleted message"
                : message.replyTo.content || `[${message.replyTo.type}]`}
            </span>
          </div>
        )}

        {/* Message Bubble Container */}
        <div
          className={`relative rounded-2xl px-4 py-2.5 shadow-md ${
            isMine
              ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-xs"
              : "bg-[#161f33] border border-gray-800 text-gray-100 rounded-tl-xs"
          }`}
        >
          {/* Soft Deleted Message View */}
          {message.isDeleted ? (
            <p className="text-xs italic opacity-70 flex items-center gap-1.5 py-0.5">
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
                <div className="space-y-2 mb-2">
                  {message.attachments.map((att) => {
                    const mediaUrl = `/api/media/${att.path}`;
                    if (att.category === "IMAGE") {
                      return (
                        <div
                          key={att.id}
                          onClick={() => onOpenMedia(mediaUrl, "IMAGE")}
                          className="relative rounded-xl overflow-hidden cursor-pointer max-w-xs group/img border border-white/10"
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
                        <div key={att.id} className="max-w-xs rounded-xl overflow-hidden border border-white/10">
                          <video src={mediaUrl} controls className="w-full max-h-60 rounded-xl" />
                        </div>
                      );
                    }
                    if (att.category === "AUDIO" || att.category === "VOICE") {
                      return (
                        <div key={att.id} className="py-1">
                          <audio src={mediaUrl} controls className="max-w-xs h-10 rounded-lg" />
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
                        className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs transition-colors ${
                          isMine
                            ? "bg-indigo-700/50 border-indigo-500/50 hover:bg-indigo-700"
                            : "bg-gray-800/80 border-gray-700 hover:bg-gray-800"
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                          <p className="text-[10px] opacity-75">
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

          {/* Time & Receipt Footer */}
          <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] opacity-70 select-none">
            {message.isEdited && !message.isDeleted && <span>(edited)</span>}
            <span suppressHydrationWarning>{timeFormatted}</span>
            {isMine && !message.isDeleted && renderReceiptIcon()}
          </div>
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
                    ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                    : "bg-gray-800/80 border-gray-700 text-gray-300"
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
            className={`absolute top-0 -translate-y-1/2 flex items-center gap-1 p-1 rounded-xl bg-[#0f172a] border border-gray-700/80 shadow-xl z-20 animate-in fade-in zoom-in-95 duration-100 ${
              isMine ? "right-2" : "left-2"
            }`}
          >
            {/* Emoji Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add Reaction"
                className="p-1 rounded-lg text-gray-400 hover:text-yellow-400 hover:bg-gray-800 transition-colors"
              >
                😀
              </button>

              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 flex items-center gap-1.5 p-1.5 rounded-xl bg-[#1e293b] border border-gray-700 shadow-2xl z-30">
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
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-400 hover:bg-gray-800 transition-colors"
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
                className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-gray-800 transition-colors"
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
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
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
