import { db } from "@/db";
import { notifications, projects } from "@/db/schema";
import { requireAdmin, sanitizeText } from "@/lib/server-auth";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function safeUrl(value: unknown, fallback = "") {
  const url = sanitizeText(value, 1000);
  return /^https?:\/\//i.test(url) ? url : fallback;
}

function valuesFromBody(body: Record<string, unknown>, fallback?: typeof projects.$inferSelect) {
  const title = sanitizeText(body.title, 140) || fallback?.title || "";
  const bikeModel = sanitizeText(body.bikeModel, 120) || fallback?.bikeModel || "";
  const powerBefore = Math.max(1, Number(body.powerBefore) || fallback?.powerBefore || 160);
  const powerAfter = Math.max(powerBefore, Number(body.powerAfter) || fallback?.powerAfter || 195);
  return {
    title,
    bikeModel,
    beforeImageUrl: safeUrl(body.beforeImageUrl, fallback?.beforeImageUrl || "https://images.pexels.com/photos/33469805/pexels-photo-33469805.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"),
    afterImageUrl: safeUrl(body.afterImageUrl, fallback?.afterImageUrl || "https://images.pexels.com/photos/38482148/pexels-photo-38482148.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"),
    summary: sanitizeText(body.summary, 700) || fallback?.summary || "Fresh high-output tuning project added from the admin bay.",
    powerBefore,
    powerAfter,
    featured: body.featured === undefined ? fallback?.featured || false : Boolean(body.featured),
    dyno: [
      { rpm: 4500, hp: Math.round(powerBefore * .34), torque: 65 },
      { rpm: 8500, hp: Math.round(powerAfter * .72), torque: 92 },
      { rpm: 12500, hp: powerAfter, torque: 96 },
    ],
  };
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const values = valuesFromBody(body);
  if (!values.title || !values.bikeModel) return Response.json({ ok: false, message: "Title and bike model required." }, { status: 400 });
  const slug = values.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const [project] = await db.insert(projects).values({ slug: `${slug}-${Date.now().toString(36)}`, ...values }).returning();
  await db.insert(notifications).values({ title: "Gallery updated", body: `${admin.name} published ${project.title}.`, type: "admin" });
  return Response.json({ ok: true, project });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  const current = await db.query.projects.findFirst({ where: eq(projects.id, id) });
  if (!current) return Response.json({ ok: false, message: "Project not found." }, { status: 404 });
  const [project] = await db.update(projects).set(valuesFromBody(body, current)).where(eq(projects.id, id)).returning();
  await db.insert(notifications).values({ title: "Build updated", body: `${admin.name} refined ${project.title}.`, type: "admin" });
  return Response.json({ ok: true, project });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ ok: false, message: "Admin access required." }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  const [project] = await db.delete(projects).where(eq(projects.id, id)).returning();
  if (!project) return Response.json({ ok: false, message: "Project not found." }, { status: 404 });
  return Response.json({ ok: true });
}
