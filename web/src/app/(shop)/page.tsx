import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await db.product.findMany({
    where: { active: true },
    include: { variants: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Shop all</h1>
      {products.length === 0 && <p className="text-stone-500">No products yet. Add some in /admin.</p>}
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
        {products.map((p) => {
          const image = (JSON.parse(p.images) as string[])[0];
          const min = Math.min(...p.variants.map((v) => v.priceCents));
          return (
            <Link key={p.id} href={`/products/${p.slug}`} className="group">
              <div className="aspect-square overflow-hidden rounded-lg bg-stone-100">
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={p.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                )}
              </div>
              <div className="mt-2 text-sm font-medium">{p.title}</div>
              <div className="text-sm text-stone-600">
                {p.variants.length > 1 && "From "}
                {Number.isFinite(min) ? formatMoney(min) : "-"}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
