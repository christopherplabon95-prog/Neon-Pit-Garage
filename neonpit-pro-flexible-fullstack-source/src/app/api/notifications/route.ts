import { db } from "@/db";
import { notifications } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.query.notifications.findMany({ orderBy: [desc(notifications.createdAt)], limit: 15 });
  return Response.json({ ok: true, notifications: rows, unread: rows.filter((item) => !item.read).length });
}
