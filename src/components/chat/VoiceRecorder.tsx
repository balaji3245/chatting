import React, { useState, useRef, useEffect } from "react";

interface VoiceRecorderProps {
  onSendVoice: (file: File) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoice, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("[VoiceRecorder Error]", err);
      alert("Microphone access denied or not available.");
      onCancel();
    }
  };

  const stopRecordingCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = () => {
    if (!mediaRecorderRef.current) return;
    const mediaRecorder = mediaRecorderRef.current;

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
      onSendVoice(file);
    };

    stopRecordingCleanup();
  };

  const handleCancel = () => {
    stopRecordingCleanup();
    onCancel();
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[#131c2e] border border-red-500/30 rounded-2xl animate-in fade-in duration-150 w-full">
      {/* Recording indicator dot & Timer */}
      <div className="flex items-center gap-2">
        <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
        <span className="text-sm font-mono font-medium text-white">{formatTime(seconds)}</span>
      </div>

      {/* Waveform Visualizer simulation */}
      <div className="flex-1 flex items-center justify-center gap-1 h-6">
        {[40, 70, 30, 90, 50, 80, 40, 100, 60, 30, 80, 50].map((h, i) => (
          <span
            key={i}
            className="w-1 bg-rose-500/80 rounded-full animate-pulse"
            style={{
              height: `${h}%`,
              animationDelay: `${(i % 4) * 0.15}s`,
            }}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCancel}
          className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title="Cancel Voice Note"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button
          onClick={handleSend}
          className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-colors"
          title="Send Voice Note"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
};
