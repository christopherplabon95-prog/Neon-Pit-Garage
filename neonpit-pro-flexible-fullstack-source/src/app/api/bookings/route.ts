import { db } from "@/db";
import { bookings, notifications } from "@/db/schema";
import { getSession, sanitizeText } from "@/lib/server-auth";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.query.bookings.findMany({ orderBy: [desc(bookings.createdAt)], limit: 20 });
  return Response.json({ ok: true, bookings: rows });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const selectedMods = Array.isArray(body.selectedMods) ? body.selectedMods.map((mod: unknown) => sanitizeText(mod, 80)).filter(Boolean) : [];
  const appointmentAt = new Date(String(body.appointmentAt));

  const values = {
    name: sanitizeText(body.name, 120),
    email: sanitizeText(body.email, 180).toLowerCase(),
    phone: sanitizeText(body.phone, 60),
    bikeModel: sanitizeText(body.bikeModel, 120),
    selectedMods,
    appointmentAt,
    notes: sanitizeText(body.notes, 700),
  };

  if (!values.name || !values.email.includes("@") || !values.phone || !values.bikeModel || Number.isNaN(appointmentAt.getTime())) {
    return Response.json({ ok: false, message: "Name, email, phone, bike model, and appointment date are required." }, { status: 400 });
  }

  const session = await getSession();
  const [booking] = await db.insert(bookings).values({ ...values, userId: session?.userId }).returning();
  await db.insert(notifications).values({ title: "New tuning booking", body: `${values.bikeModel} booked for ${selectedMods.join(", ") || "custom consultation"}.`, type: "booking" });

  return Response.json({ ok: true, booking });
}
