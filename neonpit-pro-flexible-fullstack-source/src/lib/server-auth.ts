import "server-only";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "pitlane_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  email: string;
  role: "customer" | "admin";
  exp: number;
};

function getSecret() {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-only-neon-pit-secret-change-me";
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function signPayload(encodedPayload: string) {
  return createHmac("sha256", getSecret()).update(encodedPayload).digest("base64url");
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) return false;
  const hash = pbkdf2Sync(password, salt, 120_000, 32, "sha256").toString("hex");
  const hashBuffer = Buffer.from(hash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");
  return hashBuffer.length === storedBuffer.length && timingSafeEqual(hashBuffer, storedBuffer);
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">) {
  const body: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encodedPayload = base64Url(JSON.stringify(body));
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export function parseSessionToken(token?: string): SessionPayload | null {
  if (!token) return null;
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;
    const expected = signPayload(encodedPayload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !payload.email || !payload.role || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  return parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  });
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return null;
  return user;
}

export function sanitizeText(value: unknown, maxLength = 4000) {
  return String(value ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}
