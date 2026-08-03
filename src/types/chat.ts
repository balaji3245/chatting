import { MessageStatus, MessageType } from "@prisma/client";

/**
 * Application-level explicit rank mapping for monotonic receipt transitions.
 * SENT = 1, DELIVERED = 2, READ = 3
 */
export const MessageStatusRank: Record<MessageStatus, number> = {
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
};

export interface ChatUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  lastSeen: Date | null;
}

export interface MediaSecurityConfig {
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxSizeBytes: number;
}

export const MEDIA_LIMITS: Record<MessageType, MediaSecurityConfig> = {
  TEXT: { allowedMimeTypes: [], allowedExtensions: [], maxSizeBytes: 0 },
  IMAGE: {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  VIDEO: {
    allowedMimeTypes: ["video/mp4", "video/webm"],
    allowedExtensions: [".mp4", ".webm"],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },
  AUDIO: {
    allowedMimeTypes: ["audio/mpeg", "audio/ogg", "audio/webm", "audio/wav", "audio/aac", "audio/m4a"],
    allowedExtensions: [".mp3", ".ogg", ".webm", ".wav", ".aac", ".m4a"],
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
  },
  VOICE: {
    allowedMimeTypes: ["audio/webm", "video/webm", "audio/ogg", "audio/wav", "audio/mp4"],
    allowedExtensions: [".webm", ".ogg", ".wav", ".m4a"],
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
  },
  DOCUMENT: {
    allowedMimeTypes: [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    allowedExtensions: [".pdf", ".txt", ".docx"],
    maxSizeBytes: 25 * 1024 * 1024, // 25MB
  },
};
