import { db } from "@/db";
import { notifications, orders } from "@/db/schema";
import { requireAdmin } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const statuses = ["pending", "paid", "processing", "completed", "cancelled"] as const;

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const status = String(body.status ?? "") as (typeof statuses)[number];
  if (!id || !statuses.includes(status)) return Response.json({ ok: false, message: "Valid order and status required." }, { status: 400 });

  const [order] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
  if (!order) return Response.json({ ok: false, message: "Order not found." }, { status: 404 });
  await db.insert(notifications).values({ title: "Order status updated", body: `${order.transactionId} is now ${status}.`, type: "order" });
  return Response.json({ ok: true, order });
}
