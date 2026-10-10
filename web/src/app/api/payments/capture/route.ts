import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { toAmount } from "@/lib/money";
import { addEvent, markPaid } from "@/lib/orders";
import { capturePayPalOrder } from "@/lib/paypal";

// 第 2 步：买家在 PayPal 确认付款后，服务端调用 capture 真正扣款
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { orderId?: number; token?: string } | null;
  if (typeof body?.orderId !== "number" || typeof body.token !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const order = await db.order.findFirst({ where: { id: body.orderId, token: body.token } });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const redirectUrl = `/orders/${order.id}?token=${order.token}`;
  if (order.status !== "PENDING") return NextResponse.json({ ok: true, redirectUrl });

  try {
    if (order.paymentProvider === "paypal") {
      if (!order.paymentRef) throw new Error("Missing PayPal order");
      const result = await capturePayPalOrder(order.paymentRef);
      const unit = result.purchase_units[0];
      const capture = unit?.payments.captures[0];
      // 校验：扣款成功、金额和币种与订单一致、custom_id 对得上
      if (result.status !== "COMPLETED" || capture?.status !== "COMPLETED") {
        throw new Error(`Payment not completed (${capture?.status ?? result.status})`);
      }
      if (capture.amount.value !== toAmount(order.totalCents) || capture.amount.currency_code !== order.currency) {
        await addEvent(order.id, "AMOUNT_MISMATCH", `金额不一致：${capture.amount.value} ${capture.amount.currency_code}`);
        throw new Error("Amount mismatch");
      }
      await markPaid(order.id, capture.id);
    } else {
      // 模拟支付只在没有配置真实支付时可用，避免被人绕过付款
      if (config.paymentProvider !== "mock") throw new Error("Mock payment disabled");
      await markPaid(order.id, null);
    }
    return NextResponse.json({ ok: true, redirectUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Capture failed" }, { status: 500 });
  }
}
