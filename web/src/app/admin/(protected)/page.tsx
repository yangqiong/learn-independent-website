import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { StatusBadge } from "./StatusBadge";

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    orderBy: { id: "desc" },
    take: 100,
    include: { items: true, fulfillments: true },
  });

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">订单</h1>
      <table className="w-full bg-white text-sm">
        <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
          <tr><th className="p-3">订单</th><th>时间</th><th>买家</th><th>商品</th><th>金额</th><th>状态</th><th>履约</th></tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-stone-50">
              <td className="p-3"><Link href={`/admin/orders/${o.id}`} className="font-medium underline">#{o.id}</Link></td>
              <td className="text-stone-500">{o.createdAt.toLocaleString("zh-CN")}</td>
              <td>{o.email}</td>
              <td>{o.items.reduce((s, i) => s + i.quantity, 0)} 件</td>
              <td>{formatMoney(o.totalCents, o.currency)}</td>
              <td><StatusBadge status={o.status} /></td>
              <td className="space-x-1">{o.fulfillments.map((f) => <StatusBadge key={f.id} status={f.status} prefix={f.supplier} />)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <p className="mt-6 text-sm text-stone-500">还没有订单，去店铺下一单试试。</p>}
    </div>
  );
}
