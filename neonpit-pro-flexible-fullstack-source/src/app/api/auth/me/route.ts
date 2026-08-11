import { getCurrentUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  return Response.json({ ok: true, user });
}
