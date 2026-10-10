import { notFound } from "next/navigation";
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
      <ProductForm
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
            supplierRef: v.supplierRef,
          })),
        }}
      />
    </div>
  );
}
