import { db } from "@/db";
import { notifications, products } from "@/db/schema";
import { requireAdmin, sanitizeText } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function safeImageUrl(value: unknown) {
  const url = sanitizeText(value, 1000);
  return /^https?:\/\//i.test(url) ? url : "";
}

function cleanSpecs(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 20)
      .map(([key, item]) => [sanitizeText(key, 60), sanitizeText(item, 160)])
      .filter(([key, item]) => key && item),
  );
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const name = sanitizeText(body.name, 160);
  const category = sanitizeText(body.category, 80);
  const description = sanitizeText(body.description, 1400);
  const imageUrl = safeImageUrl(body.imageUrl);
  const baseSlug = sanitizeText(body.slug || name, 180)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  if (!name || !category || !description || !imageUrl || !baseSlug) {
    return Response.json({ ok: false, message: "Name, category, description, and a valid HTTPS image URL are required." }, { status: 400 });
  }

  const [product] = await db
    .insert(products)
    .values({
      slug: `${baseSlug}-${Date.now().toString(36)}`,
      name,
      category,
      description,
      specs: cleanSpecs(body.specs),
      priceCents: Math.max(100, Number(body.priceCents) || 100),
      inventory: Math.max(0, Number(body.inventory) || 0),
      horsepowerGain: Math.max(0, Number(body.horsepowerGain) || 0),
      imageUrl,
      accent: sanitizeText(body.accent, 20) || "#00e5ff",
      featured: Boolean(body.featured),
    })
    .returning();

  await db.insert(notifications).values({ title: "New catalog drop", body: `${admin.name} published ${product.name}.`, type: "admin" });
  return Response.json({ ok: true, product });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) return Response.json({ ok: false, message: "Valid product id required." }, { status: 400 });

  const current = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!current) return Response.json({ ok: false, message: "Product not found." }, { status: 404 });

  const imageUrl = body.imageUrl === undefined ? current.imageUrl : safeImageUrl(body.imageUrl);
  if (!imageUrl) return Response.json({ ok: false, message: "A valid HTTPS image URL is required." }, { status: 400 });

  const [product] = await db
    .update(products)
    .set({
      name: body.name === undefined ? current.name : sanitizeText(body.name, 160) || current.name,
      category: body.category === undefined ? current.category : sanitizeText(body.category, 80) || current.category,
      description: body.description === undefined ? current.description : sanitizeText(body.description, 1400) || current.description,
      specs: body.specs === undefined ? current.specs : cleanSpecs(body.specs),
      priceCents: body.priceCents === undefined ? current.priceCents : Math.max(100, Number(body.priceCents) || current.priceCents),
      inventory: body.inventory === undefined ? current.inventory : Math.max(0, Number(body.inventory) || 0),
      horsepowerGain: body.horsepowerGain === undefined ? current.horsepowerGain : Math.max(0, Number(body.horsepowerGain) || 0),
      imageUrl,
      accent: body.accent === undefined ? current.accent : sanitizeText(body.accent, 20) || current.accent,
      featured: body.featured === undefined ? current.featured : Boolean(body.featured),
    })
    .where(eq(products.id, id))
    .returning();

  await db.insert(notifications).values({ title: "Catalog updated", body: `${product.name} was updated by ${admin.name}.`, type: "admin" });
  return Response.json({ ok: true, product });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ ok: false, message: "Valid product id required." }, { status: 400 });

  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) return Response.json({ ok: false, message: "Product not found." }, { status: 404 });

  try {
    await db.delete(products).where(eq(products.id, id));
  } catch {
    return Response.json({ ok: false, message: "This product belongs to an existing order and cannot be deleted. Set inventory to zero instead." }, { status: 409 });
  }

  await db.insert(notifications).values({ title: "Catalog item removed", body: `${product.name} was removed by ${admin.name}.`, type: "admin" });
  return Response.json({ ok: true });
}
