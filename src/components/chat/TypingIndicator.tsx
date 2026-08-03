import React from "react";

interface TypingIndicatorProps {
  displayName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ displayName }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 my-1 max-w-fit rounded-2xl bg-[#131c2e] border border-gray-800 text-xs text-gray-400 animate-in fade-in duration-150">
      <span className="font-medium text-gray-300">{displayName || "Peer"} is typing</span>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
      </div>
    </div>
  );
};
