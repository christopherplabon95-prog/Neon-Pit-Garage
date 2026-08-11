import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, sanitizeText, setSessionCookie } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = sanitizeText(body.name, 120);
  const email = sanitizeText(body.email, 180).toLowerCase();
  const password = String(body.password ?? "");
  const phone = sanitizeText(body.phone, 60);

  if (!name || !email.includes("@") || password.length < 8) {
    return Response.json({ ok: false, message: "Name, valid email, and 8+ character password are required." }, { status: 400 });
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return Response.json({ ok: false, message: "An account with that email already exists." }, { status: 409 });

  const [user] = await db
    .insert(users)
    .values({ name, email, phone, passwordHash: await hashPassword(password), role: "customer" })
    .returning({ id: users.id, email: users.email, role: users.role, name: users.name });

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
  return Response.json({ ok: true, user });
}
