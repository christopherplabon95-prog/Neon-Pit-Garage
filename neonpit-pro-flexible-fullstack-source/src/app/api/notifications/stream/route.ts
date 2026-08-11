import { db } from "@/db";
import { notifications } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let counter = 0;

  const stream = new ReadableStream({
    async start(controller) {
      async function push() {
        const rows = await db.query.notifications.findMany({ orderBy: [desc(notifications.createdAt)], limit: 6 });
        controller.enqueue(encoder.encode(`event: pit-alert\ndata: ${JSON.stringify({ counter: counter++, notifications: rows })}\n\n`));
      }

      await push();
      const interval = setInterval(() => {
        push().catch(() => controller.close());
      }, 12000);

      setTimeout(() => {
        clearInterval(interval);
        controller.close();
      }, 55_000);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
