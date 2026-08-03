import React from "react";

interface AvatarProps {
  name: string;
  url?: string | null;
  size?: "sm" | "md" | "lg";
  isOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  url,
  size = "md",
  isOnline,
  className = "",
}) => {
  const initial = name ? name.charAt(0).toUpperCase() : "?";

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  }[size];

  const statusSize = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  }[size];

  return (
    <div className={`relative inline-block ${className}`}>
      {url ? (
        <img
          src={url}
          alt={name}
          className={`${sizeClasses} rounded-full object-cover border border-gray-700/50`}
        />
      ) : (
        <div
          className={`${sizeClasses} rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-semibold flex items-center justify-center border border-indigo-500/30 shadow-inner select-none`}
        >
          {initial}
        </div>
      )}

      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${statusSize} rounded-full border-2 border-[#0b0f19] ${
            isOnline ? "bg-emerald-500" : "bg-gray-500"
          }`}
        />
      )}
    </div>
  );
};
