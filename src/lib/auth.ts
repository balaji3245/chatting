import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { SessionUser } from "@/types/auth";

export const COOKIE_NAME =
  process.env.NODE_ENV === "production" ? "__Host-chat_session" : "chat_session";

export const SESSION_DURATION_DAYS = 30;

/**
 * Returns standard HttpOnly cookie configuration
 */
export function getCookieOptions(expiresAt?: Date) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "strict" as const,
    path: "/",
    expires: expiresAt ?? new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000),
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
  };
}

/**
 * Hashes a plaintext password using bcryptjs (work factor 12)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verifies a plaintext password against a bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generates a cryptographically secure 32-byte hex session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes SHA-256 hash of a raw session token
 */
export function hashSessionToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a new session in PostgreSQL and returns the raw token and expiration date
 */
export async function createSession(
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string }
): Promise<{ rawToken: string; expiresAt: Date }> {
  const rawToken = generateSessionToken();
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });

  return { rawToken, expiresAt };
}

/**
 * Validates a raw session token against PostgreSQL
 */
export async function verifySessionToken(rawToken: string): Promise<SessionUser | null> {
  if (!rawToken || typeof rawToken !== "string") return null;

  const tokenHash = hashSessionToken(rawToken);

  const session = await db.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!session) return null;

  // Reject and cleanup expired session
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

/**
 * Revokes (deletes) a session from PostgreSQL
 */
export async function revokeSession(rawToken: string): Promise<void> {
  if (!rawToken || typeof rawToken !== "string") return;
  const tokenHash = hashSessionToken(rawToken);
  await db.session.deleteMany({ where: { tokenHash } }).catch(() => {});
}

/**
 * Extracts client IP address from HTTP request headers safely
 */
export function getClientIp(req: Request | { headers: Headers }): string {
  const headers = "headers" in req ? req.headers : new Headers();
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((ip) => ip.trim());
    if (ips.length > 0 && ips[0]) return ips[0];
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Checks if a login attempt is temporarily locked out via FailedLogin table
 */
export async function checkBruteForceLockout(
  ipAddress: string,
  username: string
): Promise<{ isLocked: boolean; remainingSeconds?: number }> {
  const record = await db.failedLogin.findUnique({
    where: {
      ipAddress_username: { ipAddress, username },
    },
  });

  if (!record || !record.lockedUntil) {
    return { isLocked: false };
  }

  const now = new Date();
  if (record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil.getTime() - now.getTime()) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  return { isLocked: false };
}

/**
 * Records a failed login attempt and applies exponential lockout if threshold reached
 */
export async function recordFailedLogin(ipAddress: string, username: string): Promise<void> {
  const record = await db.failedLogin.findUnique({
    where: {
      ipAddress_username: { ipAddress, username },
    },
  });

  const newAttempts = (record?.attempts ?? 0) + 1;
  let lockoutMs = 0;

  if (newAttempts >= 10) {
    lockoutMs = 60 * 60 * 1000; // 1 hour
  } else if (newAttempts >= 7) {
    lockoutMs = 15 * 60 * 1000; // 15 minutes
  } else if (newAttempts >= 5) {
    lockoutMs = 5 * 60 * 1000; // 5 minutes
  }

  const lockedUntil = lockoutMs > 0 ? new Date(Date.now() + lockoutMs) : null;

  await db.failedLogin.upsert({
    where: {
      ipAddress_username: { ipAddress, username },
    },
    update: {
      attempts: newAttempts,
      lockedUntil,
      lastAttempt: new Date(),
    },
    create: {
      ipAddress,
      username,
      attempts: 1,
      lockedUntil: null,
      lastAttempt: new Date(),
    },
  });
}

/**
 * Clears failed login record upon successful authentication
 */
export async function clearFailedLogin(ipAddress: string, username: string): Promise<void> {
  await db.failedLogin.deleteMany({
    where: { ipAddress, username },
  });
}
