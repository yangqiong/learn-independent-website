import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { addEvent, checkoutSchema, createPendingOrder } from "@/lib/orders";
import { createPayPalOrder } from "@/lib/paypal";

// 第 1 步：创建本地订单（PENDING），PayPal 模式下同时创建 PayPal 订单并返回其 id 给前端按钮
export async function POST(req: Request) {
  const parsed = checkoutSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    const order = await createPendingOrder(parsed.data);
    let paypalOrderId: string | null = null;
    if (config.paymentProvider === "paypal") {
      paypalOrderId = await createPayPalOrder(order);
      await db.order.update({ where: { id: order.id }, data: { paymentRef: paypalOrderId } });
      await addEvent(order.id, "PAYPAL_CREATED", `已创建 PayPal 订单 ${paypalOrderId}`);
    }
    return NextResponse.json({ orderId: order.id, token: order.token, paypalOrderId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed" }, { status: 500 });
  }
}
