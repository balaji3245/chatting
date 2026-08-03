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
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Modal state for user selection post-pattern entry
  const [drawnPattern, setDrawnPattern] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [authenticatingUser, setAuthenticatingUser] = useState<"t" | "adesh" | null>(null);

  // Triggered when 9-dot pattern drawing completes
  const handlePatternComplete = async (patternNodes: number[]) => {
    const patternStr = patternNodes.join("-");
    setStatus("idle");
    setErrorMessage("");
    setIsVerifying(true);

    try {
      // Instantly verify if pattern is correct before asking to select profile
      const res = await fetch("/api/auth/verify-pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern: patternStr }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        setStatus("error");
        setErrorMessage(data.error || "Invalid pattern lock. Please try again.");
        setDrawnPattern(null);
        return;
      }

      // Pattern is 100% correct! Open Select Profile modal
      setStatus("success");
      setDrawnPattern(patternStr);
      setShowUserModal(true);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
      setDrawnPattern(null);
    } finally {
      setIsVerifying(false);
    }
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
      {/* Main Pattern Lock Wrapper (Clean without box borders) */}
      <div className="w-full max-w-md p-4 space-y-6 flex flex-col items-center relative">
        {/* Title */}
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center justify-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Pattern Security Lock
          </h2>
          <p className="text-xs text-slate-500">
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

        {/* Verifying / Loading Indicator */}
        {isVerifying && (
          <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium animate-in fade-in">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Verifying pattern...
          </div>
        )}

        {/* Error Message Display */}
        {errorMessage && !isVerifying && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center w-full animate-in fade-in">
            {errorMessage}
          </div>
        )}
      </div>

      {/* User Selection Popup Modal (After Pattern is drawn) */}
      {showUserModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onTouchEnd={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 flex flex-col items-center">
            {/* Modal Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto text-indigo-600 shadow-sm">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                Select Profile
              </h3>
              <p className="text-xs text-slate-500">
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
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isSubmitting) handleUserSelectAndLogin("t");
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Avatar name="T" size="md" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      T
                    </p>
                    <p className="text-xs text-slate-500">@t</p>
                  </div>
                </div>
                {authenticatingUser === "t" ? (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {/* Adesh Button */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleUserSelectAndLogin("adesh")}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isSubmitting) handleUserSelectAndLogin("adesh");
                }}
                className="w-full p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition-all flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <Avatar name="Adesh" size="md" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Adesh
                    </p>
                    <p className="text-xs text-slate-500">@adesh</p>
                  </div>
                </div>
                {authenticatingUser === "adesh" ? (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              onTouchEnd={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isSubmitting) {
                  setShowUserModal(false);
                  setDrawnPattern(null);
                  setStatus("idle");
                }
              }}
              className="text-xs text-slate-500 hover:text-slate-800 transition-colors py-1"
            >
              Cancel / Re-draw Pattern
            </button>
          </div>
        </div>
      )}
    </>
  );
};
