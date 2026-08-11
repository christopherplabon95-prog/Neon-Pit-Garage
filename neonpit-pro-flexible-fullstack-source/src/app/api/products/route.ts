import { db } from "@/db";
import { products } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { asc, eq, ilike, or } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureSeeded();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const where = category
    ? eq(products.category, category)
    : q
      ? or(ilike(products.name, `%${q}%`), ilike(products.description, `%${q}%`), ilike(products.category, `%${q}%`))
      : undefined;

  const rows = await db.query.products.findMany({ where, orderBy: [asc(products.id)] });
  return Response.json({ ok: true, products: rows });
}
