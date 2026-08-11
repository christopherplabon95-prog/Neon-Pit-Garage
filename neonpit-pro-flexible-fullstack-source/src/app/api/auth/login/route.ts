import { db } from "@/db";
import { users } from "@/db/schema";
import { sanitizeText, setSessionCookie, verifyPassword } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = sanitizeText(body.email, 180).toLowerCase();
  const password = String(body.password ?? "");

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return Response.json({ ok: false, message: "Invalid email or password." }, { status: 401 });
  }

  await setSessionCookie({ userId: user.id, email: user.email, role: user.role });
  return Response.json({ ok: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
}
