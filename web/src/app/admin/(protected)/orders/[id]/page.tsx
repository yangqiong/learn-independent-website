import { notFound } from "next/navigation";
import { cjConfigured } from "@/lib/config";
import { db } from "@/lib/db";
import { countryName, formatMoney } from "@/lib/money";
import { pushToCJ, refundOrder, shipFulfillment, syncCJ } from "../../actions";
import { StatusBadge } from "../../StatusBadge";

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id: Number(id) },
    include: {
      items: { include: { variant: true } },
      fulfillments: { include: { items: true }, orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) notFound();
  const cost = order.items.reduce((s, i) => s + (i.variant.costCents ?? 0) * i.quantity, 0);
  const canRefund = ["PAID", "FULFILLING", "SHIPPED"].includes(order.status);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">订单 #{order.id}</h1>
        <StatusBadge status={order.status} />
        <a href={`/orders/${order.id}?token=${order.token}`} target="_blank" className="text-sm text-stone-500 underline">买家视角 ↗</a>
        {canRefund && (
          <form action={refundOrder} className="ml-auto">
            <input type="hidden" name="orderId" value={order.id} />
            <button className="btn-outline text-red-600">全额退款</button>
          </form>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm">
          <h2 className="mb-3 font-medium">商品</h2>
          <ul className="space-y-2">
            {order.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span>{i.title} · {i.variantName} × {i.quantity} <span className="text-xs text-stone-400">[{i.supplier}]</span></span>
                <span>{formatMoney(i.unitCents * i.quantity, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-stone-200 pt-3">
            <div className="flex justify-between"><span>运费</span><span>{formatMoney(order.shippingCents)}</span></div>
            <div className="flex justify-between font-semibold"><span>合计</span><span>{formatMoney(order.totalCents)}</span></div>
            {cost > 0 && <div className="flex justify-between text-xs text-stone-500"><span>商品成本（不含物流）</span><span>{formatMoney(cost)}</span></div>}
          </div>
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm">
          <h2 className="mb-3 font-medium">买家 & 收货地址</h2>
          <p className="leading-relaxed text-stone-700">
            {order.email}<br />
            {order.shipName} {order.shipPhone}<br />
            {order.shipLine1} {order.shipLine2}<br />
            {order.shipCity}, {order.shipState} {order.shipZip}<br />
            {countryName(order.shipCountry)}
          </p>
          <p className="mt-3 text-xs text-stone-500">
            支付：{order.paymentProvider} {order.paymentRef && `· ${order.paymentRef}`} {order.captureRef && `· capture ${order.captureRef}`}
          </p>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-medium">履约 / 发货</h2>
        {order.fulfillments.length === 0 && <p className="text-sm text-stone-500">支付成功后会自动按供应商拆分履约单。</p>}
        {order.fulfillments.map((f) => (
          <div key={f.id} className="rounded-lg border border-stone-200 bg-white p-5 text-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-medium">{f.supplier === "CJ" ? "CJ 代发" : "手动发货"}</span>
              <StatusBadge status={f.status} />
              {f.supplierOrderId && <span className="text-xs text-stone-500">CJ 订单号 {f.supplierOrderId}</span>}
              {f.logisticName && <span className="text-xs text-stone-500">· {f.logisticName}</span>}
            </div>
            <div className="text-stone-600">{f.items.map((i) => `${i.title}（${i.variantName}）× ${i.quantity}`).join("，")}</div>
            {f.error && <p className="mt-2 text-red-600">{f.error}</p>}
            {f.trackingNumber && (
              <p className="mt-2">运单：{f.carrier} <a href={f.trackingUrl ?? "#"} target="_blank" className="underline">{f.trackingNumber}</a></p>
            )}

            {f.status !== "SHIPPED" && order.status !== "REFUNDED" && (
              <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4">
                {f.supplier === "CJ" && (f.status === "PENDING" || f.status === "FAILED") && (
                  <form action={pushToCJ}>
                    <input type="hidden" name="fulfillmentId" value={f.id} />
                    <button className="btn" disabled={!cjConfigured()}>推送到 CJ 下单</button>
                    {!cjConfigured() && <span className="ml-2 text-xs text-stone-500">需先配置 CJ_API_KEY</span>}
                  </form>
                )}
                {f.supplier === "CJ" && f.status === "PLACED" && (
                  <form action={syncCJ}>
                    <input type="hidden" name="fulfillmentId" value={f.id} />
                    <button className="btn">从 CJ 同步物流</button>
                  </form>
                )}
                <form action={shipFulfillment} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="fulfillmentId" value={f.id} />
                  <div><label className="label">物流商</label><input name="carrier" placeholder="YunExpress / 4PX / USPS" className="input w-40" /></div>
                  <div><label className="label">运单号</label><input name="trackingNumber" required className="input w-48" /></div>
                  <button className="btn-outline">{f.supplier === "CJ" ? "手动填写运单号" : "标记已发货"}</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-3 font-medium">时间线</h2>
        <ol className="space-y-2 border-l-2 border-stone-200 pl-4 text-sm">
          {order.events.map((e) => (
            <li key={e.id}>
              <span className="mr-2 text-xs text-stone-400">{e.createdAt.toLocaleString("zh-CN")}</span>
              <span className="mr-2 rounded bg-stone-100 px-1.5 text-xs">{e.type}</span>
              {e.message}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
