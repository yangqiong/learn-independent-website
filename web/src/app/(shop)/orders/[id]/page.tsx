import { notFound } from "next/navigation";
import { countryName, formatMoney } from "@/lib/money";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  PENDING: "Awaiting payment",
  PAID: "Paid",
  FULFILLING: "Processing",
  SHIPPED: "Shipped",
  REFUNDED: "Refunded",
  CANCELLED: "Cancelled",
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ id }, { token }] = await Promise.all([params, searchParams]);
  const order = await db.order.findFirst({
    where: { id: Number(id), token: token ?? "" },
    include: { items: true, fulfillments: { include: { items: true } } },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-sm text-stone-500">Order #{order.id}</p>
        <h1 className="text-2xl font-semibold">{STATUS[order.status] ?? order.status}</h1>
        {order.status !== "PENDING" && (
          <p className="mt-1 text-sm text-stone-600">A confirmation has been sent to {order.email}.</p>
        )}
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>{i.title} · {i.variantName} × {i.quantity}</span>
              <span>{formatMoney(i.unitCents * i.quantity, order.currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(order.shippingCents, order.currency)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total</span><span>{formatMoney(order.totalCents, order.currency)}</span></div>
        </div>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm">
        <h2 className="mb-2 font-medium">Shipping to</h2>
        <p className="text-stone-600">
          {order.shipName}<br />
          {order.shipLine1} {order.shipLine2}<br />
          {order.shipCity}, {order.shipState} {order.shipZip}<br />
          {countryName(order.shipCountry)}
        </p>
      </section>

      {order.fulfillments.length > 0 && (
        <section className="rounded-lg border border-stone-200 bg-white p-5 text-sm">
          <h2 className="mb-2 font-medium">Shipments</h2>
          <ul className="space-y-3">
            {order.fulfillments.map((f, idx) => (
              <li key={f.id}>
                <div className="font-medium">Package {idx + 1} · {f.status === "SHIPPED" ? "Shipped" : "Preparing"}</div>
                <div className="text-stone-500">{f.items.map((i) => `${i.title} × ${i.quantity}`).join(", ")}</div>
                {f.trackingNumber && (
                  <div>
                    {f.carrier} ·{" "}
                    <a href={f.trackingUrl ?? "#"} target="_blank" className="underline">{f.trackingNumber}</a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
