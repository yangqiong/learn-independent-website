import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon } from "@/components/Icons";
import { ProductCard } from "@/components/ProductCard";
import { hasTag, kitContents, productHighlights, productImages } from "@/lib/catalog";
import { config, isFreeShipping } from "@/lib/config";
import { db } from "@/lib/db";
import { AddToCart } from "./AddToCart";
import { Gallery } from "./Gallery";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug }, include: { variants: true } });
  if (!product || !product.active) notFound();

  const highlights = productHighlights(product);
  const contents = kitContents(product);
  const isKit = hasTag(product, "kit");
  const related = await db.product.findMany({
    where: { active: true, id: { not: product.id } },
    include: { variants: true },
    take: 3,
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-5 pt-8">
      <nav className="mb-6 text-xs text-muted">
        <Link href="/" className="hover:text-ink">Home</Link> / <Link href={isKit ? "/#kits" : "/#tech"} className="hover:text-ink">{isKit ? "Kits" : "Organizers"}</Link>
      </nav>

      <div className="grid gap-12 md:grid-cols-2">
        <Gallery images={productImages(product)} alt={product.title} />

        <div className="space-y-7 md:sticky md:top-24 md:self-start">
          <div>
            <p className="eyebrow mb-2">{isKit ? `Kit · ${contents.length} pieces` : "Organizer"}</p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{product.title}</h1>
          </div>

          <AddToCart variants={product.variants.map((v) => ({ id: v.id, name: v.name, priceCents: v.priceCents }))} />

          <p className="text-sm text-muted">
            {isFreeShipping() ? "Free US shipping" : "Shipping calculated at checkout"} · Ships in {config.processingTime} · Arrives in {config.deliveryEstimate}
          </p>

          {highlights.length > 0 && (
            <ul className="space-y-3 border-t border-line pt-6">
              {highlights.map((h) => (
                <li key={h} className="flex gap-3 text-sm leading-relaxed">
                  <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  {h}
                </li>
              ))}
            </ul>
          )}

          {contents.length > 0 && (
            <div className="rounded-2xl bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold">What&apos;s in the kit</h2>
              <ol className="space-y-2 text-sm text-muted">
                {contents.map((c, i) => (
                  <li key={c} className="flex gap-3"><span className="font-medium text-ink">{i + 1}</span>{c}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="divide-y divide-line border-y border-line text-sm">
            {[
              ["Details", product.description],
              ["Shipping & delivery", `Free shipping to US addresses. Orders are processed within ${config.processingTime} and typically delivered within ${config.deliveryEstimate}. ${isKit ? "Pieces in a kit may arrive in separate packages, each with its own tracking number." : ""}`],
              ["30-day guarantee", "If anything arrives damaged or isn't as described, email us within 30 days of delivery for a free replacement or a full refund."],
            ].map(([title, body], i) => (
              <details key={title} className="group py-4" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {title}<span className="text-lg text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-muted">{body}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="pt-24">
          <h2 className="h-section mb-8">You might also like</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
