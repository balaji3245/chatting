import React from "react";

interface TypingIndicatorProps {
  displayName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ displayName }) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 my-1 max-w-fit rounded-2xl bg-white border border-slate-200/90 text-xs text-slate-500 shadow-xs animate-in fade-in duration-150">
      <span className="font-medium text-slate-700">{displayName || "Peer"} is typing</span>
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
      </div>
    </div>
  );
};
