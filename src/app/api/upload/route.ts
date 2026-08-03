import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/storage";
import { MessageType } from "@prisma/client";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await verifySessionToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as MessageType) || "DOCUMENT";
    const messageId = formData.get("messageId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const savedFile = await saveUploadedFile(buffer, file.name, category);

    // If messageId is provided, persist Attachment in DB immediately
    let attachment = null;
    if (messageId) {
      attachment = await db.attachment.create({
        data: {
          messageId,
          filename: savedFile.filename,
          originalName: savedFile.originalName,
          mimeType: savedFile.mimeType,
          size: savedFile.size,
          category: savedFile.category,
          path: savedFile.path,
        },
      });
    }

    return NextResponse.json({
      success: true,
      file: savedFile,
      attachment,
    });
  } catch (error: any) {
    console.error("[Upload API Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to process upload" },
      { status: 400 }
    );
  }
}
