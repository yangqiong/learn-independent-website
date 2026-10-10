import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { ClockIcon, LockIcon, ReturnIcon, TruckIcon } from "@/components/Icons";
import { hasTag, productImages } from "@/lib/catalog";
import { config } from "@/lib/config";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const TRIPS = [
  { tag: "trip:business", title: "Business trip", text: "Chargers, cables and the daily essentials — sorted before the meeting." },
  { tag: "trip:carry-on", title: "Carry-on only", text: "A week of clothes in one bag, without the chaos at security." },
  { tag: "trip:weekend", title: "Weekend away", text: "Two nights, one bag, everything where you left it." },
];

export default async function HomePage() {
  const products = await db.product.findMany({
    where: { active: true },
    include: { variants: true },
    orderBy: { createdAt: "asc" },
  });
  const kits = products.filter((p) => hasTag(p, "kit"));
  const tech = products.filter((p) => hasTag(p, "tech"));
  const rest = products.filter((p) => !kits.includes(p) && !tech.includes(p));
  const hero = kits[0] ?? products[0];
  const heroImage = hero ? productImages(hero)[0] : null;

  const faq = [
    ["How long does shipping take?", `Orders are processed within ${config.processingTime} and typically arrive within ${config.deliveryEstimate}. You'll get a tracking link by email as soon as your order ships.`],
    ["Where do you ship?", "We currently ship to addresses in the United States, and shipping is free on every order."],
    ["What if something isn't right?", "If an item arrives damaged or isn't as described, email us within 30 days and we'll send a replacement or a full refund. See our returns policy for details."],
    ["Can kits be split up?", "Kits ship as a set and are priced as a set. Some pieces may arrive in separate packages — each one gets its own tracking number."],
    ["How do I pay?", "Checkout is handled securely by PayPal. You can pay with your PayPal balance or any major credit or debit card."],
  ];

  return (
    <>
      {/* 主视觉 */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-2 md:pt-16">
        <div className="space-y-6">
          <p className="eyebrow">Travel organizer kits</p>
          <h1 className="h-display">{config.tagline}</h1>
          <p className="max-w-md text-lg leading-relaxed text-muted">
            Thoughtfully matched organizers for carry-ons, business trips and weekends away — so every trip starts packed, not piled.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="#kits" className="btn-accent">Shop the kits</Link>
            <Link href="#tech" className="btn-outline">Tech organizers</Link>
          </div>
        </div>
        {heroImage && hero && (
          <Link href={`/products/${hero.slug}`} className="block overflow-hidden rounded-3xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={heroImage} alt={hero.title} className="aspect-square w-full object-cover" />
          </Link>
        )}
      </section>

      {/* 信任条 */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-6 text-sm md:grid-cols-4">
          {[
            [TruckIcon, "Free US shipping", "On every order"],
            [ClockIcon, "Ships in 1–3 days", `Arrives in ${config.deliveryEstimate}`],
            [ReturnIcon, "30-day guarantee", "Replacement or refund"],
            [LockIcon, "Secure checkout", "Powered by PayPal"],
          ].map(([Icon, title, sub]) => {
            const I = Icon as typeof TruckIcon;
            return (
              <div key={title as string} className="flex items-center gap-3">
                <I className="h-6 w-6 shrink-0 text-accent" />
                <div><div className="font-medium">{title as string}</div><div className="text-xs text-muted">{sub as string}</div></div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 套装 */}
      {kits.length > 0 && (
        <section id="kits" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">The kits</p>
              <h2 className="h-section">Matched sets for every kind of trip</h2>
            </div>
            <p className="hidden max-w-xs text-sm text-muted md:block">Each kit is a curated set of pieces chosen to work together — no guessing what fits.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {kits.map((p) => <ProductCard key={p.id} product={p} large />)}
          </div>
        </section>
      )}

      {/* 按出行场景 */}
      <section id="trips" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-20">
        <p className="eyebrow mb-2">Shop by trip</p>
        <h2 className="h-section mb-8">Where are you headed?</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {TRIPS.map((t) => {
            const match = products.find((p) => hasTag(p, t.tag) && hasTag(p, "kit")) ?? products.find((p) => hasTag(p, t.tag));
            return (
              <Link
                key={t.tag}
                href={match ? `/products/${match.slug}` : "#kits"}
                className="group rounded-2xl border border-line bg-white p-6 transition hover:border-ink"
              >
                <h3 className="text-lg font-medium">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.text}</p>
                <p className="mt-6 text-sm font-medium text-accent">{match ? `Shop ${match.title} →` : "Browse kits →"}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 单品 */}
      {tech.length > 0 && (
        <section id="tech" className="mx-auto max-w-6xl scroll-mt-24 px-5 pt-20">
          <p className="eyebrow mb-2">Tech organizers</p>
          <h2 className="h-section mb-8">No more cable spaghetti</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {tech.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {rest.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-20">
          <h2 className="h-section mb-8">More essentials</h2>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {rest.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* 品牌理念 */}
      <section className="mx-auto max-w-6xl px-5 pt-24">
        <div className="grid gap-10 rounded-3xl bg-sand px-8 py-14 md:grid-cols-3 md:px-14">
          {[
            ["Everything has a place", "Compartments sized for what you actually pack — chargers, cubes of clothes, the toothbrush you always forget."],
            ["Kits, not clutter", "We group pieces that work together, so you buy one set instead of five mismatched pouches."],
            ["Honest shipping", `Free US shipping on every order and a realistic delivery window of ${config.deliveryEstimate}, with tracking.`],
          ].map(([title, text]) => (
            <div key={title}>
              <h3 className="text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-5 pt-24">
        <p className="eyebrow mb-2 text-center">FAQ</p>
        <h2 className="h-section mb-8 text-center">Good questions</h2>
        <div className="divide-y divide-line border-y border-line">
          {faq.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                {q}<span className="text-xl text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
