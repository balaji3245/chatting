import React from "react";
import { Avatar } from "@/components/ui/Avatar";
import { ChatUser } from "@/types/chat";

interface ChatHeaderProps {
  peerUser: ChatUser | null;
  isPeerOnline: boolean;
  currentUser: { displayName: string; username: string; avatarUrl?: string | null };
  onOpenSearch: () => void;
  onLogout: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  peerUser,
  isPeerOnline,
  currentUser,
  onOpenSearch,
  onLogout,
}) => {
  const formatLastSeen = (date: Date | string | null) => {
    if (!date) return "Offline";
    const d = new Date(date);
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return `Last seen ${timeStr}`;
  };

  return (
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
  );
};
