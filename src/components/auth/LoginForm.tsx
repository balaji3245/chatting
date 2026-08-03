"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PatternLockCanvas } from "./PatternLockCanvas";
import { Avatar } from "@/components/ui/Avatar";

export const LoginForm: React.FC = () => {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Modal state for user selection post-pattern entry
  const [drawnPattern, setDrawnPattern] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [authenticatingUser, setAuthenticatingUser] = useState<"t" | "adesh" | null>(null);

  // Triggered when 9-dot pattern drawing completes
  const handlePatternComplete = (patternNodes: number[]) => {
    const patternStr = patternNodes.join("-");
    setDrawnPattern(patternStr);
    setStatus("idle");
    setErrorMessage("");
    setShowUserModal(true);
  };

  // Called when user selects T or Adesh from the modal popup
  const handleUserSelectAndLogin = async (username: "t" | "adesh") => {
    if (!drawnPattern) return;

    setAuthenticatingUser(username);
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          pattern: drawnPattern,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setShowUserModal(false);
        setStatus("error");
        setErrorMessage(data.error || "Invalid pattern lock. Please try again.");
        setDrawnPattern(null);
        return;
      }

      setStatus("success");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 400);
    } catch (err: any) {
      setShowUserModal(false);
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
      setDrawnPattern(null);
    } finally {
      setIsSubmitting(false);
      setAuthenticatingUser(null);
    }
  };

  return (
    <>
      {/* Main Pattern Lock Card */}
      <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#111827]/90 border border-gray-800 shadow-2xl space-y-6 flex flex-col items-center relative">
        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Pattern Security Lock
          </h2>
          <p className="text-xs text-gray-400">
            Enter my mobile screen lock
          </p>
        </div>

        {/* 9-Dot Interactive Canvas */}
        <PatternLockCanvas
          onComplete={handlePatternComplete}
          status={status}
          onResetStatus={() => {
            setStatus("idle");
            setErrorMessage("");
          }}
        />

        {/* Error Message Display */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center w-full animate-in fade-in">
            {errorMessage}
          </div>
        )}
      </div>

      {/* User Selection Popup Modal (After Pattern is drawn) */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#111827] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
            {/* Modal Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400 shadow-inner">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Select Profile
              </h3>
              <p className="text-xs text-gray-400">
                who you are
              </p>
            </div>

            {/* Profile Selection Cards */}
            <div className="w-full space-y-3">
              {/* T Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleUserSelectAndLogin("t")}
                className="w-full p-3.5 rounded-2xl bg-[#162032] border border-gray-800 hover:border-indigo-500/50 hover:bg-indigo-600/10 text-left transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Avatar name="T" size="md" />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      T
                    </p>
                    <p className="text-xs text-gray-400">@t</p>
                  </div>
                </div>
                {authenticatingUser === "t" ? (
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {/* Adesh Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleUserSelectAndLogin("adesh")}
                className="w-full p-3.5 rounded-2xl bg-[#162032] border border-gray-800 hover:border-indigo-500/50 hover:bg-indigo-600/10 text-left transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Avatar name="Adesh" size="md" />
                  <div>
                    <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">
                      Adesh
                    </p>
                    <p className="text-xs text-gray-400">@adesh</p>
                  </div>
                </div>
                {authenticatingUser === "adesh" ? (
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setShowUserModal(false);
                setDrawnPattern(null);
                setStatus("idle");
              }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
            >
              Cancel / Re-draw Pattern
            </button>
          </div>
        </div>
      )}
    </>
  );
};
