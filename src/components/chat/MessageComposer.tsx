import React, { useState, useRef, useEffect } from "react";
import { VoiceRecorder } from "./VoiceRecorder";
import { MessageType } from "@prisma/client";

interface MessageComposerProps {
  onSendMessage: (data: {
    content: string;
    type: MessageType;
    replyToId?: string | null;
    attachmentFiles?: any[];
  }) => void;
  replyingMessage: any | null;
  onCancelReply: () => void;
  editingMessage: any | null;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, content: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  replyingMessage,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  onTypingStart,
  onTypingStop,
}) => {
  const [content, setContent] = useState("");
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync content when editing a message
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content || "");
    }
  }, [editingMessage]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);

    // Throttle typing indicator emits
    onTypingStart();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      onTypingStop();
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const inferCategoryFromFile = (file: File): MessageType => {
    const type = file.type;
    if (type.startsWith("image/")) return "IMAGE";
    if (type.startsWith("video/")) return "VIDEO";
    if (type.startsWith("audio/")) return "AUDIO";
    return "DOCUMENT";
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed && selectedFiles.length === 0) return;

    if (editingMessage) {
      onSaveEdit(editingMessage.id, trimmed);
      setContent("");
      onCancelEdit();
      return;
    }

    setIsUploading(true);
    try {
      const uploadedAttachmentFiles: any[] = [];

      // Process file uploads if files are attached
      for (const file of selectedFiles) {
        const category = inferCategoryFromFile(file);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "File upload failed");
        }

        const data = await res.json();
        if (data.file) {
          uploadedAttachmentFiles.push(data.file);
        }
      }

      let msgType: MessageType = "TEXT";
      if (uploadedAttachmentFiles.length > 0) {
        msgType = uploadedAttachmentFiles[0].category;
      }

      onSendMessage({
        content: trimmed,
        type: msgType,
        replyToId: replyingMessage?.id || null,
        attachmentFiles: uploadedAttachmentFiles,
      });

      // Clear composer state
      setContent("");
      setSelectedFiles([]);
      if (replyingMessage) onCancelReply();
      onTypingStop();
    } catch (err: any) {
      alert(`Failed to send message: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendVoiceNote = async (voiceFile: File) => {
    setIsRecordingVoice(false);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", voiceFile);
      formData.append("category", "VOICE");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Voice note upload failed");
      }

      const data = await res.json();
      if (data.file) {
        onSendMessage({
          content: null as any,
          type: "VOICE",
          replyToId: replyingMessage?.id || null,
          attachmentFiles: [data.file],
        });
      }
      if (replyingMessage) onCancelReply();
    } catch (err: any) {
      alert(`Voice note failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const EMOJIS = ["😊", "😂", "❤️", "👍", "🔥", "🎉", "🙌", "🙏", "😍", "✨"];

  return (
    <div className="p-3 md:p-4 bg-[#0f172a]/95 backdrop-blur-md border-t border-gray-800/80 sticky bottom-0 z-30">
      {/* Voice Recorder Overlay Mode */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendVoice={handleSendVoiceNote}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Replying Banner */}
          {replyingMessage && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs text-indigo-200">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-semibold">Replying to {replyingMessage.sender.displayName}:</span>
                <span className="italic truncate">{replyingMessage.content || `[${replyingMessage.type}]`}</span>
              </div>
              <button onClick={onCancelReply} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>
          )}

          {/* Editing Banner */}
          {editingMessage && (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-xs text-amber-200">
              <span className="font-semibold">Editing message...</span>
              <button onClick={onCancelEdit} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>
          )}

          {/* Selected File Previews */}
          {selectedFiles.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1e293b] border border-gray-700 text-xs text-gray-200 shrink-0"
                >
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button
                    onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== idx))}
                    className="text-gray-400 hover:text-rose-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Control Row */}
          <div className="flex items-end gap-2">
            {/* Attachment File Trigger */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-[#1a233a] hover:bg-gray-800 text-gray-400 hover:text-indigo-400 transition-colors shrink-0"
              title="Attach File"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>

            {/* Main Text Input Area */}
            <div className="relative flex-1">
              <textarea
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                rows={1}
                className="w-full bg-[#131c2e] border border-gray-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-2xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none max-h-32 transition-all"
              />

              {/* Emoji Picker Popup */}
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 flex items-center gap-2 p-2 rounded-2xl bg-[#1e293b] border border-gray-700 shadow-2xl z-40">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => {
                        setContent((prev) => prev + e);
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

            {/* Quick Emoji Trigger */}
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 rounded-xl bg-[#1a233a] hover:bg-gray-800 text-gray-400 hover:text-yellow-400 transition-colors shrink-0"
              title="Emoji"
            >
              😊
            </button>

            {/* Voice Recorder or Send Trigger */}
            {!content.trim() && selectedFiles.length === 0 && !editingMessage ? (
              <button
                type="button"
                onClick={() => setIsRecordingVoice(true)}
                className="p-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 transition-colors shrink-0 border border-indigo-500/30"
                title="Voice Note"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isUploading}
                className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all shrink-0 active:scale-95 disabled:opacity-50"
                title="Send Message"
              >
                {isUploading ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
