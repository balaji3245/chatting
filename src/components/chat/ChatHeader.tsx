import React, { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ChatUser } from "@/types/chat";

interface ChatHeaderProps {
  peerUser: ChatUser | null;
  isPeerOnline: boolean;
  currentUser: { displayName: string; username: string; avatarUrl?: string | null };
  onOpenSearch: () => void;
  onLogout: () => void;
  onClearChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  peerUser,
  isPeerOnline,
  currentUser,
  onOpenSearch,
  onLogout,
  onClearChat,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const formatLastSeen = (date: Date | string | null) => {
    if (!date) return "Offline";
    const d = new Date(date);
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `Last seen ${timeStr}`;
  };

  const handleClearConfirm = () => {
    setShowConfirm(false);
    onClearChat();
  };

  return (
    <>
      <header className="h-16 px-4 md:px-6 bg-[#0f172a]/90 backdrop-blur-md border-b border-gray-800/80 flex items-center justify-between sticky top-0 z-30">
        {/* Peer Profile Summary */}
        <div className="flex items-center gap-3">
          {peerUser ? (
            <>
              <Avatar
                name={peerUser.displayName}
                url={peerUser.avatarUrl}
                isOnline={isPeerOnline}
                size="md"
              />
              <div>
                <h1 className="text-sm font-semibold text-white leading-tight flex items-center gap-1.5">
                  {peerUser.displayName}
                  <span className="text-xs text-gray-500 font-normal">@{peerUser.username}</span>
                </h1>
                <p className="text-xs text-emerald-400 font-medium">
                  {isPeerOnline ? (
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Online
                    </span>
                  ) : (
                    <span className="text-gray-400 font-normal" suppressHydrationWarning>
                      {formatLastSeen(peerUser.lastSeen)}
                    </span>
                  )}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-800 animate-pulse" />
              <div className="space-y-1">
                <div className="w-28 h-4 bg-gray-800 rounded animate-pulse" />
                <div className="w-16 h-3 bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Icons */}
        <div className="flex items-center gap-2">
          {/* Clear Chat Button */}
          <button
            onClick={() => setShowConfirm(true)}
            title="Clear Chat"
            className="p-2 rounded-xl text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors focus:outline-none"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>

          {/* Logout Button */}
          <button
            onClick={onLogout}
            title={`Logout from @${currentUser.username}`}
            className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus:outline-none"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Clear Chat Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-gray-700 rounded-2xl shadow-2xl p-6 w-80 mx-4 flex flex-col gap-4">
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/15 mx-auto">
              <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>

            <div className="text-center">
              <h2 className="text-white font-semibold text-base">Clear Chat?</h2>
              <p className="text-gray-400 text-sm mt-1">
                All messages will be permanently deleted for both users. This cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearConfirm}
                className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-orange-600/20"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
