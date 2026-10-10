import { notFound } from "next/navigation";
import { isFreeShipping } from "@/lib/config";
import { db } from "@/lib/db";
import { AddToCart } from "./AddToCart";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, include: { variants: true } });
  if (!product || !product.active) notFound();
  const images = JSON.parse(product.images) as string[];

  return (
    <div className="grid gap-10 md:grid-cols-2">
      <div className="space-y-3">
        {images.slice(0, 4).map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt={product.title} className="w-full rounded-lg bg-stone-100" />
        ))}
      </div>
      <div>
        <h1 className="text-2xl font-semibold">{product.title}</h1>
        <AddToCart
          variants={product.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents }))}
        />
        {isFreeShipping() && <p className="mt-4 text-sm text-stone-600">✓ Free shipping · Ships in 1–3 business days</p>}
        <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-stone-700">{product.description}</p>
      </div>
    </div>
  );
}
