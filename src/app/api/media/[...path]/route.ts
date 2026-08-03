import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { resolveVaultPath } from "@/lib/storage";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { path: pathSegments } = await context.params;
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const relativePath = pathSegments.join("/");
    const filePath = resolveVaultPath(relativePath);

    if (!filePath) {
      return NextResponse.json({ error: "Invalid path traversal" }, { status: 400 });
    }

    try {
      await fsp.access(filePath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = await fsp.stat(filePath);
    const fileSize = stat.size;

    // Basic MIME type lookup by extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".ogg": "audio/ogg",
      ".wav": "audio/wav",
      ".m4a": "audio/m4a",
      ".aac": "audio/aac",
      ".pdf": "application/pdf",
      ".txt": "text/plain",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const contentType = mimeMap[ext] || "application/octet-stream";
    const range = request.headers.get("range");

    // Handle HTTP Range Requests (206 Partial Content) for Audio/Video seeking
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${fileSize}` },
        });
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      // Convert Node read stream to Web ReadableStream
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize.toString(),
          "Content-Type": contentType,
          "X-Content-Type-Options": "nosniff",
          "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
        },
      });
    }

    // Full File Response (200 OK)
    const fileStream = fs.createReadStream(filePath);
    const stream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${path.basename(filePath)}"`,
      },
    });
  } catch (error) {
    console.error("[Media Stream API Error]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
