import { randomBytes } from "crypto";
import { z } from "zod";
import { config } from "./config";
import { db } from "./db";
import { sendOrderConfirmation, sendRefundNotice } from "./email";
import { dispatchFulfillments } from "./fulfillment";

export const checkoutSchema = z.object({
  email: z.string().email(),
  items: z
    .array(z.object({ variantId: z.string(), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Cart is empty"),
  address: z.object({
    name: z.string().min(1),
    phone: z.string().default(""),
    line1: z.string().min(1),
    line2: z.string().default(""),
    city: z.string().min(1),
    state: z.string().default(""),
    zip: z.string().min(1),
    country: z.string().length(2),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export function shippingFor(subtotalCents: number) {
  return subtotalCents >= config.freeShippingOverCents ? 0 : config.shippingFlatCents;
}

export async function addEvent(orderId: number, type: string, message: string) {
  await db.orderEvent.create({ data: { orderId, type, message } });
}

// 价格一律以服务端数据库为准，不信任前端传来的金额
export async function createPendingOrder(input: CheckoutInput) {
  const variants = await db.variant.findMany({
    where: { id: { in: input.items.map((i) => i.variantId) }, product: { active: true } },
    include: { product: true },
  });
  const lines = input.items.map((item) => {
    const v = variants.find((x) => x.id === item.variantId);
    if (!v) throw new Error("Some items are no longer available");
    return { v, quantity: item.quantity };
  });
  const subtotalCents = lines.reduce((s, l) => s + l.v.priceCents * l.quantity, 0);
  const shippingCents = shippingFor(subtotalCents);
  const a = input.address;

  const order = await db.order.create({
    data: {
      token: randomBytes(16).toString("hex"),
      email: input.email,
      currency: config.currency,
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
      shipName: a.name,
      shipPhone: a.phone,
      shipLine1: a.line1,
      shipLine2: a.line2,
      shipCity: a.city,
      shipState: a.state,
      shipZip: a.zip,
      shipCountry: a.country.toUpperCase(),
      paymentProvider: config.paymentProvider,
      items: {
        create: lines.map(({ v, quantity }) => ({
          variantId: v.id,
          title: v.product.title,
          variantName: v.name,
          unitCents: v.priceCents,
          quantity,
          supplier: v.product.supplier,
        })),
      },
      events: { create: { type: "CREATED", message: "买家提交订单，等待支付" } },
    },
    include: { items: true },
  });
  return order;
}

// 幂等：前端回调和 PayPal webhook 可能都会触发，只有第一次生效
export async function markPaid(orderId: number, captureRef: string | null) {
  const { count } = await db.order.updateMany({
    where: { id: orderId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date(), captureRef },
  });
  if (count === 0) return false;

  await addEvent(orderId, "PAID", `支付成功${captureRef ? `（capture ${captureRef}）` : "（模拟支付）"}`);
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  await sendOrderConfirmation(order);
  await addEvent(orderId, "EMAIL", "已发送下单确认邮件");
  await dispatchFulfillments(orderId);
  return true;
}

export async function markRefunded(orderId: number, note: string) {
  const { count } = await db.order.updateMany({
    where: { id: orderId, status: { notIn: ["PENDING", "REFUNDED", "CANCELLED"] } },
    data: { status: "REFUNDED" },
  });
  if (count === 0) return false;
  await addEvent(orderId, "REFUNDED", note);
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  await sendRefundNotice(order);
  return true;
}
