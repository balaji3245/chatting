import React from "react";
import { MessageType } from "@prisma/client";

interface MediaPreviewModalProps {
  mediaUrl: string | null;
  category: MessageType | null;
  onClose: () => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  mediaUrl,
  category,
  onClose,
}) => {
  if (!mediaUrl || !category) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-300 hover:text-white p-2 rounded-full bg-gray-800/60 hover:bg-gray-800 transition-colors z-50"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div
        className="relative max-w-4xl max-h-[85vh] overflow-hidden flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {category === "IMAGE" && (
          <img
            src={mediaUrl}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        )}
        {category === "VIDEO" && (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
          />
        )}
      </div>
    </div>
  );
};
