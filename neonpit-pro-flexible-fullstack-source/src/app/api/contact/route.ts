import { db } from "@/db";
import { contacts, notifications } from "@/db/schema";
import { sanitizeText } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = sanitizeText(body.name, 120);
  const email = sanitizeText(body.email, 180).toLowerCase();
  const phone = sanitizeText(body.phone, 60);
  const message = sanitizeText(body.message, 1200);

  if (!name || !email.includes("@") || message.length < 8) {
    return Response.json({ ok: false, message: "Name, valid email, and message are required." }, { status: 400 });
  }

  const [contact] = await db.insert(contacts).values({ name, email, phone, message }).returning();
  await db.insert(notifications).values({ title: "New contact message", body: `${name}: ${message.slice(0, 90)}`, type: "message" });
  return Response.json({ ok: true, contact });
}
