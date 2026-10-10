import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markPaid, markRefunded } from "@/lib/orders";
import { verifyPayPalWebhook } from "@/lib/paypal";

type WebhookEvent = {
  event_type: string;
  resource: {
    id: string;
    custom_id?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    links?: { rel: string; href: string }[];
  };
};

// 兜底：如果买家付款后关掉了页面，前端没来得及调 capture，PayPal 也会通过 webhook 通知我们
// 本地调试需要公网地址（如 ngrok / cloudflared），并在 PayPal 开发者后台配置 webhook 拿到 PAYPAL_WEBHOOK_ID
export async function POST(req: Request) {
  const event = (await req.json().catch(() => null)) as WebhookEvent | null;
  if (!event || !(await verifyPayPalWebhook(req.headers, event))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }
  const r = event.resource;

  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const paypalOrderId = r.supplementary_data?.related_ids?.order_id;
    const order = await db.order.findFirst({
      where: paypalOrderId ? { paymentRef: paypalOrderId } : { id: Number(r.custom_id) },
    });
    if (order) await markPaid(order.id, r.id);
  }

  if (event.event_type === "PAYMENT.CAPTURE.REFUNDED") {
    // 退款资源的 up 链接指向原 capture
    const captureId = r.links?.find((l) => l.rel === "up")?.href.split("/").pop();
    const order = captureId ? await db.order.findFirst({ where: { captureRef: captureId } }) : null;
    if (order) await markRefunded(order.id, `PayPal 退款通知（refund ${r.id}）`);
  }

  return NextResponse.json({ ok: true });
}
