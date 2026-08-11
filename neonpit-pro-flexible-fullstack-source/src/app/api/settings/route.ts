import { db } from "@/db";
import { notifications, siteSettings } from "@/db/schema";
import { requireAdmin, sanitizeText } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function safeUrl(value: unknown, fallback: string) {
  const url = sanitizeText(value, 1000);
  return /^https?:\/\//i.test(url) ? url : fallback;
}

function safeCurrencies(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const values = value.map((item) => sanitizeText(item, 6).toUpperCase()).filter((item) => /^[A-Z]{3}$/.test(item));
  return [...new Set(values)].slice(0, 12);
}

function safeRates(value: unknown, fallback: Record<string, number>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([code, rate]) => [sanitizeText(code, 6).toUpperCase(), Number(rate)] as const)
      .filter(([code, rate]) => /^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0),
  );
}

export async function GET() {
  const settings = await db.query.siteSettings.findFirst();
  return Response.json({ ok: true, settings });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const current = await db.query.siteSettings.findFirst();
  if (!current) return Response.json({ ok: false, message: "Store settings are not initialized." }, { status: 404 });

  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const defaultCurrency = sanitizeText(body.defaultCurrency, 6).toUpperCase();
  const enabledCurrencies = safeCurrencies(body.enabledCurrencies, current.enabledCurrencies);
  const currencyRates = safeRates(body.currencyRates, current.currencyRates);
  const openHour = Math.min(23, Math.max(0, Number(body.openHour) || 0));
  const closeHour = Math.min(24, Math.max(1, Number(body.closeHour) || 22));
  const openDays = Array.isArray(body.openDays)
    ? body.openDays.map(Number).filter((day: number) => Number.isInteger(day) && day >= 0 && day <= 6)
    : current.businessHours.openDays;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Response.json({ ok: false, message: "Latitude or longitude is invalid." }, { status: 400 });
  }
  if (!enabledCurrencies.includes(defaultCurrency) || !currencyRates[defaultCurrency]) {
    return Response.json({ ok: false, message: "Default currency must be enabled and have a conversion rate." }, { status: 400 });
  }

  const [settings] = await db
    .update(siteSettings)
    .set({
      storeName: sanitizeText(body.storeName, 60) || current.storeName,
      announcement: sanitizeText(body.announcement, 180) || current.announcement,
      heroEyebrow: sanitizeText(body.heroEyebrow, 160) || current.heroEyebrow,
      heroTitle: sanitizeText(body.heroTitle, 180) || current.heroTitle,
      heroSubtitle: sanitizeText(body.heroSubtitle, 500) || current.heroSubtitle,
      heroImageUrl: safeUrl(body.heroImageUrl, current.heroImageUrl),
      locationName: sanitizeText(body.locationName, 120) || current.locationName,
      address: sanitizeText(body.address, 300) || current.address,
      latitude: String(latitude),
      longitude: String(longitude),
      phone: sanitizeText(body.phone, 60) || current.phone,
      whatsapp: sanitizeText(body.whatsapp, 40) || current.whatsapp,
      supportEmail: sanitizeText(body.supportEmail, 180).toLowerCase() || current.supportEmail,
      defaultCurrency,
      enabledCurrencies,
      currencyRates,
      businessHours: { openHour, closeHour, openDays: openDays.length ? openDays : current.businessHours.openDays },
      instagramUrl: safeUrl(body.instagramUrl, current.instagramUrl),
      updatedAt: new Date(),
    })
    .where(eq(siteSettings.id, current.id))
    .returning();

  await db.insert(notifications).values({ title: "Storefront settings updated", body: `${admin.name} published new brand, currency, or location settings.`, type: "admin" });
  return Response.json({ ok: true, settings });
}
