import { db } from "@/db";
import { notifications, products, projects, siteSettings } from "@/db/schema";
import { getCurrentUser } from "@/lib/server-auth";
import { ensureSeeded } from "@/lib/seed";
import { desc } from "drizzle-orm";
import PitLaneClient from "./PitLaneClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeeded();
  const [productRows, projectRows, notificationRows, settings, user] = await Promise.all([
    db.query.products.findMany({ orderBy: [desc(products.featured), desc(products.createdAt)] }),
    db.query.projects.findMany({ orderBy: [desc(projects.featured), desc(projects.createdAt)] }),
    db.query.notifications.findMany({ orderBy: [desc(notifications.createdAt)], limit: 10 }),
    db.query.siteSettings.findFirst({ orderBy: [desc(siteSettings.updatedAt)] }),
    getCurrentUser(),
  ]);

  return (
    <PitLaneClient
      initialProducts={productRows}
      projects={projectRows}
      initialNotifications={notificationRows.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
      initialSettings={settings!}
      initialUser={user ?? null}
    />
  );
}
