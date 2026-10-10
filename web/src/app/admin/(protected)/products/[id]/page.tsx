import { notFound } from "next/navigation";
import { feeRule } from "@/lib/config";
import { db } from "@/lib/db";
import { ProductForm } from "../ProductForm";

const dollars = (cents: number | null) => (cents == null ? "" : (cents / 100).toFixed(2));

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await db.product.findUnique({ where: { id }, include: { variants: true } });
  if (!p) notFound();

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">编辑商品</h1>
      <p className="mb-6 text-sm text-stone-500">
        供应商：{p.supplier === "CJ" ? `CJ 代发（pid ${p.supplierRef}）` : "手动发货"}
        {!p.active && " · 当前为下架状态，确认价格后勾选“上架”"}
      </p>
      {p.supplier === "CJ" && p.variants.some((v) => v.shippingCostCents == null) && (
        <p className="-mt-4 mb-6 rounded bg-red-50 p-3 text-sm text-red-700">
          部分规格运费试算失败，运费成本为空，售价里没有包含运费。请补填运费成本并调整售价后再上架。
        </p>
      )}
      <ProductForm
        fee={feeRule()}
        initial={{
          id: p.id,
          title: p.title,
          slug: p.slug,
          description: p.description,
          images: JSON.parse(p.images) as string[],
          active: p.active,
          supplier: p.supplier,
          variants: p.variants.map((v) => ({
            id: v.id,
            name: v.name,
            sku: v.sku ?? "",
            price: dollars(v.priceCents),
            cost: dollars(v.costCents),
            shipping: dollars(v.shippingCostCents),
            supplierRef: v.supplierRef,
          })),
        }}
      />
    </div>
  );
}
