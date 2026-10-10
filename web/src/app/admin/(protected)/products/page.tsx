import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function ProductsPage() {
  const products = await db.product.findMany({ include: { variants: true }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">商品</h1>
        <div className="space-x-2">
          <Link href="/admin/cj" className="btn-outline">从 CJ 导入</Link>
          <Link href="/admin/products/new" className="btn">新建商品</Link>
        </div>
      </div>
      <table className="w-full bg-white text-sm">
        <thead className="border-b border-stone-200 text-left text-xs text-stone-500">
          <tr><th className="p-3">商品</th><th>供应商</th><th>规格</th><th>售价</th><th>成本</th><th>状态</th></tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {products.map((p) => {
            const prices = p.variants.map((v) => v.priceCents);
            const costs = p.variants.flatMap((v) => (v.costCents == null ? [] : [v.costCents]));
            return (
              <tr key={p.id} className="hover:bg-stone-50">
                <td className="flex items-center gap-3 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(JSON.parse(p.images) as string[])[0]} alt="" className="h-10 w-10 rounded bg-stone-100 object-cover" />
                  <Link href={`/admin/products/${p.id}`} className="underline">{p.title}</Link>
                </td>
                <td>{p.supplier}</td>
                <td>{p.variants.length}</td>
                <td>{formatMoney(Math.min(...prices))}{prices.length > 1 && ` - ${formatMoney(Math.max(...prices))}`}</td>
                <td>{costs.length ? formatMoney(Math.min(...costs)) : "-"}</td>
                <td>{p.active ? "上架" : <span className="text-stone-400">下架</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
