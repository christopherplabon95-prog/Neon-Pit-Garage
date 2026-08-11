import { db } from "@/db";
import { notifications } from "@/db/schema";
import { sanitizeText } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = sanitizeText(body.email, 180).toLowerCase();
  if (!email.includes("@")) return Response.json({ ok: false, message: "Valid email required." }, { status: 400 });

  await db.insert(notifications).values({
    title: "Password recovery requested",
    body: `A secure reset link was requested for ${email}. In production this sends an email token.`,
    type: "auth",
  });

  return Response.json({ ok: true, message: "If the account exists, a secure recovery link has been queued." });
}
