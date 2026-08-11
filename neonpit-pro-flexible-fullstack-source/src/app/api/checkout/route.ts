import { db } from "@/db";
import { notifications, orderItems, orders, products } from "@/db/schema";
import { getSession, sanitizeText } from "@/lib/server-auth";
import { eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

type CartItem = { productId: number; quantity: number };
class CheckoutError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? (body.items as CartItem[]) : [];
  const cleanItems = items
    .map((item) => ({ productId: Number(item.productId), quantity: Math.max(1, Math.min(9, Number(item.quantity) || 1)) }))
    .filter((item) => Number.isInteger(item.productId));

  if (cleanItems.length === 0) return Response.json({ ok: false, message: "Cart is empty." }, { status: 400 });

  const customerName = sanitizeText(body.customerName, 120);
  const customerEmail = sanitizeText(body.customerEmail, 180).toLowerCase();
  const shippingAddress = sanitizeText(body.shippingAddress, 500);
  const provider = body.provider === "paypal" ? "paypal" : body.provider === "stripe" ? "stripe" : "pit_credit";

  if (!customerName || !customerEmail.includes("@") || !shippingAddress) {
    return Response.json({ ok: false, message: "Customer name, email, and shipping address are required." }, { status: 400 });
  }

  const session = await getSession();
  const transactionId = `${provider.toUpperCase()}-${randomUUID().slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

  try {
    const result = await db.transaction(async (tx) => {
      const ids = cleanItems.map((item) => item.productId);
      const rows = await tx.select().from(products).where(inArray(products.id, ids)).for("update");
      const productMap = new Map(rows.map((product) => [product.id, product]));
      let totalCents = 0;

      for (const item of cleanItems) {
        const product = productMap.get(item.productId);
        if (!product) throw new CheckoutError(`Product ${item.productId} was not found.`, 404);
        if (product.inventory < item.quantity) throw new CheckoutError(`${product.name} has only ${product.inventory} left.`, 409);
        totalCents += product.priceCents * item.quantity;
      }

      const [order] = await tx.insert(orders).values({
        userId: session?.userId,
        customerName,
        customerEmail,
        totalCents,
        status: "paid",
        provider,
        transactionId,
        shippingAddress,
      }).returning();

      await tx.insert(orderItems).values(cleanItems.map((item) => {
        const product = productMap.get(item.productId)!;
        return { orderId: order.id, productId: product.id, quantity: item.quantity, unitPriceCents: product.priceCents };
      }));

      for (const item of cleanItems) {
        await tx.update(products).set({ inventory: sql`${products.inventory} - ${item.quantity}` }).where(eq(products.id, item.productId));
      }

      await tx.insert(notifications).values({
        title: "New paid order",
        body: `${customerName} completed a ${(totalCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })} ${provider} checkout.`,
        type: "order",
      });

      return { id: order.id, totalCents, status: order.status, transactionId, provider };
    });

    return Response.json({ ok: true, order: result });
  } catch (error) {
    if (error instanceof CheckoutError) return Response.json({ ok: false, message: error.message }, { status: error.status });
    return Response.json({ ok: false, message: "Checkout could not be completed. No payment or inventory change was recorded." }, { status: 500 });
  }
}
