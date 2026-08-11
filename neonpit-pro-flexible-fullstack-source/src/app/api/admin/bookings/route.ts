import { db } from "@/db";
import { bookings, notifications } from "@/db/schema";
import { requireAdmin } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const statuses = ["requested", "confirmed", "in_progress", "completed", "cancelled"] as const;

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const status = String(body.status ?? "") as (typeof statuses)[number];
  if (!id || !statuses.includes(status)) return Response.json({ ok: false, message: "Valid booking and status required." }, { status: 400 });

  const [booking] = await db.update(bookings).set({ status }).where(eq(bookings.id, id)).returning();
  if (!booking) return Response.json({ ok: false, message: "Booking not found." }, { status: 404 });
  await db.insert(notifications).values({ title: "Booking status updated", body: `${booking.bikeModel} for ${booking.name} is now ${status.replace("_", " ")}.`, type: "booking" });
  return Response.json({ ok: true, booking });
}
