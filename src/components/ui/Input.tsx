import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 text-gray-400 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-[#131c2e] border ${
            error ? "border-rose-500/80 focus:ring-rose-500" : "border-gray-800 focus:border-indigo-500 focus:ring-indigo-500/30"
          } rounded-xl py-2.5 ${leftIcon ? "pl-10" : "pl-3.5"} ${
            rightIcon ? "pr-10" : "pr-3.5"
          } text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-gray-400 pointer-events-none flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
};
