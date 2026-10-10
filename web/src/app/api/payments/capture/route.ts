import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { toAmount } from "@/lib/money";
import { addEvent, markPaid } from "@/lib/orders";
import { capturePayPalOrder, refundPayPalCapture } from "@/lib/paypal";

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
      if (
        unit.custom_id !== String(order.id) ||
        capture.amount.value !== toAmount(order.totalCents) ||
        capture.amount.currency_code !== order.currency
      ) {
        // 钱已经扣了但对不上订单：自动退回，订单保持待支付，买家可以重新付款
        const refund = await refundPayPalCapture(capture.id).catch((e) => ({ id: "-", status: `FAILED ${e}` }));
        await addEvent(
          order.id,
          "AMOUNT_MISMATCH",
          `扣款与订单不符（${capture.amount.value} ${capture.amount.currency_code}，custom_id ${unit.custom_id}），已自动退款 ${refund.id} ${refund.status}`,
        );
        throw new Error("Payment did not match the order and was refunded. Please try again.");
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
