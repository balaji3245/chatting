import fs from "fs/promises";
import path from "path";
import { createId } from "@paralleldrive/cuid2";
import { fileTypeFromBuffer } from "file-type";
import { MessageType } from "@prisma/client";
import { MEDIA_LIMITS } from "@/types/chat";

const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "uploads");

/**
 * Ensures that storage directory exists for the specified media category
 */
export async function ensureUploadDir(category: MessageType): Promise<string> {
  const dirPath = path.join(UPLOAD_BASE_DIR, category.toLowerCase());
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

export interface ValidatedFilePayload {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: MessageType;
  path: string;
}

/**
 * Validates magic bytes, mime type, size, and saves file securely to the private vault
 */
export async function saveUploadedFile(
  buffer: Buffer,
  originalName: string,
  category: MessageType
): Promise<ValidatedFilePayload> {
  const config = MEDIA_LIMITS[category];
  if (!config || config.maxSizeBytes === 0) {
    throw new Error(`Invalid media category: ${category}`);
  }

  // 1. File size check
  if (buffer.length > config.maxSizeBytes) {
    const maxMb = config.maxSizeBytes / (1024 * 1024);
    throw new Error(`File size exceeds maximum allowed limit of ${maxMb}MB`);
  }

  // 2. Magic Bytes / Binary signature validation using file-type
  const fileTypeResult = await fileTypeFromBuffer(buffer);

  // For text/plain documents or fallback signature matches if fileTypeFromBuffer is undefined
  let detectedMime = fileTypeResult?.mime;
  let detectedExt = fileTypeResult?.ext ? `.${fileTypeResult.ext}` : "";

  // Plain text fallback handling (.txt files may return undefined in file-type)
  if (!detectedMime && category === "DOCUMENT" && originalName.endsWith(".txt")) {
    detectedMime = "text/plain";
    detectedExt = ".txt";
  }

  if (!detectedMime) {
    throw new Error("Failed to verify file binary signature (magic bytes match failed).");
  }

  // Check if detected MIME type is permitted for this category
  if (!config.allowedMimeTypes.includes(detectedMime)) {
    throw new Error(`File MIME type "${detectedMime}" is not permitted for category ${category}.`);
  }

  // Sanitize extension and generate cuid2 filename
  const cleanExt = detectedExt || path.extname(originalName).toLowerCase();
  const filename = `${createId()}${cleanExt}`;

  // 3. Save file to storage directory outside web root
  const categoryDir = await ensureUploadDir(category);
  const fullPath = path.join(categoryDir, filename);
  const relativePath = path.join(category.toLowerCase(), filename);

  await fs.writeFile(fullPath, buffer);

  return {
    filename,
    originalName,
    mimeType: detectedMime,
    size: buffer.length,
    category,
    path: relativePath,
  };
}

/**
 * Resolves full path to a file inside the upload vault safely preventing directory traversal
 */
export function resolveVaultPath(relativePath: string): string | null {
  const normalized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
  const fullPath = path.join(UPLOAD_BASE_DIR, normalized);

  // Security check: ensure path stays within UPLOAD_BASE_DIR
  if (!fullPath.startsWith(UPLOAD_BASE_DIR)) {
    return null;
  }
  return fullPath;
}
