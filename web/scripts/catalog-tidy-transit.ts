// Tidy Transit 商品目录：从 CJ 拉取最新成本/运费，创建或更新套装与单品，并下架目录外的商品
// 运行：pnpm catalog:tidy（可重复执行，按 slug 更新）
import * as cj from "../src/lib/cj";
import { db } from "../src/lib/db";
import { toCents } from "../src/lib/money";
import { paymentFeeCents, unitProfitCents } from "../src/lib/pricing";

const PID = {
  cableA: "1703055389602238464", // 单层理线包（小号）
  cableB: "1646726512265547776", // 双层理线包（大号）
  cubes: "1386852733046362112", // 8 件套收纳袋
  toiletry: "1382909456957968384", // 挂式洗漱包
  passport: "1BA30466-381C-44A5-8A86-8A2DFDF29A4C", // RFID 护照夹
};

type Ref = { pid: string; key?: string };
type Img = string | ((get: (pid: string) => cj.CJProduct) => string);

type SingleDef = {
  kind: "single";
  slug: string;
  title: string;
  description: string;
  highlights: string[];
  tags: string[];
  pid: string;
  variants: { key?: string; name: string; priceCents: number }[];
  images: Img[];
};

type KitDef = {
  kind: "kit";
  slug: string;
  title: string;
  description: string;
  highlights: string[];
  tags: string[];
  priceCents: number;
  components: (Ref & { name: string; quantity: number })[];
  images: Img[];
};

const set = (pid: string, i: number): Img => (get) => get(pid).productImageSet?.[i] ?? get(pid).bigImage;
const vimg = (pid: string, key?: string): Img => (get) => pickVariant(get(pid), key).variantImage ?? get(pid).bigImage;

const CATALOG: (SingleDef | KitDef)[] = [
  {
    kind: "kit",
    slug: "carry-on-kit",
    title: "The Carry-On Kit",
    description:
      "Everything you need to live out of a carry-on. Eight packing pieces keep clothes compressed and sorted, a hanging toiletry bag turns any hook into a bathroom shelf, and an RFID-blocking passport wallet keeps documents, cards and boarding passes in one place.",
    highlights: [
      "8-piece packing set: 4 cubes in graduated sizes, a shoe bag, a laundry bag and 2 zip pouches",
      "Hanging toiletry bag with a fold-out hook and see-through pockets",
      "RFID-blocking passport wallet with slots for cards, cash and boarding passes",
      "Coordinated gray set that folds flat when you're home",
    ],
    tags: ["kit", "trip:carry-on", "trip:weekend"],
    priceCents: 3899,
    components: [
      { pid: PID.cubes, key: "Gray-8 piece set", name: "8-piece packing cube set", quantity: 1 },
      { pid: PID.toiletry, key: "C56 Gray", name: "Hanging toiletry bag", quantity: 1 },
      { pid: PID.passport, name: "RFID-blocking passport wallet", quantity: 1 },
    ],
    images: ["/kits/carry-on-kit.jpg", set(PID.cubes, 1), vimg(PID.toiletry, "C56 Gray"), (get) => get(PID.passport).bigImage],
  },
  {
    kind: "kit",
    slug: "tech-duo",
    title: "The Tech Duo",
    description:
      "Our two tech organizers as a set: the Double-Layer Tech Organizer for chargers, power banks and adapters, plus the Compact Tech Pouch for the cables and earbuds you reach for on the go. Built for work trips, and $14.99 less than buying both separately.",
    highlights: [
      "Double-Layer Tech Organizer for bulky chargers, power banks and adapters",
      "Compact Tech Pouch for earbuds, cables and cards",
      "Elastic loops, mesh pockets and splash-resistant fabric on both",
      "Save $14.99 vs. buying separately",
    ],
    tags: ["kit", "trip:business"],
    priceCents: 4999,
    components: [
      { pid: PID.cableB, name: "Double-Layer Tech Organizer", quantity: 1 },
      { pid: PID.cableA, key: "Gray", name: "Compact Tech Pouch", quantity: 1 },
    ],
    images: ["/kits/tech-duo.jpg", set(PID.cableB, 0), vimg(PID.cableA, "Gray"), set(PID.cableB, 3), set(PID.cableB, 4)],
  },
  {
    kind: "single",
    slug: "double-layer-tech-organizer",
    title: "Double-Layer Tech Organizer",
    description:
      "Two zippered layers for everything with a plug. Keep the laptop charger, power bank and adapters in the roomy bottom compartment, and cables, earbuds and SD cards on the elastic loops up top. Open it on a hotel desk and everything is right there.\n\nColor: gray. Material: polyester with a splash-resistant finish.",
    highlights: [
      "Two zippered compartments: bulky chargers below, cables and small accessories above",
      "Elastic loops and mesh pockets hold everything in place",
      "Fits a laptop charger, power bank, cables, mouse and adapters",
      "Carry handle for pulling it straight out of your bag",
    ],
    tags: ["tech", "trip:business"],
    pid: PID.cableB,
    variants: [{ name: "Gray", priceCents: 3499 }],
    images: [set(PID.cableB, 0), set(PID.cableB, 3), set(PID.cableB, 4), set(PID.cableB, 5), set(PID.cableB, 1)],
  },
  {
    kind: "single",
    slug: "compact-tech-pouch",
    title: "Compact Tech Pouch",
    description:
      "A grab-and-go pouch for the small things that always go missing: earbuds, a charging cable, a wall plug, cards and a USB drive. Elastic loops, mesh pockets and adjustable dividers give everything its own spot, and the slim shape slides into a backpack, tote or carry-on.\n\nSize: approx. 9.5 × 7 × 4 in (24 × 18 × 10 cm). Material: polyester with a splash-resistant finish.",
    highlights: [
      "Elastic loops, mesh pockets and adjustable dividers for chargers, cables and earbuds",
      "Slim 9.5 × 7 in footprint fits a backpack sleeve or tote",
      "Splash-resistant fabric with a sturdy carry handle",
      "Available in gray or black",
    ],
    tags: ["tech", "trip:business"],
    pid: PID.cableA,
    variants: [
      { key: "Gray", name: "Gray", priceCents: 2999 },
      { key: "Black", name: "Black", priceCents: 2999 },
    ],
    images: [vimg(PID.cableA, "Gray"), set(PID.cableA, 2), set(PID.cableA, 5), set(PID.cableA, 0), set(PID.cableA, 1)],
  },
];

function pickVariant(p: cj.CJProduct, key?: string) {
  const v = key ? p.variants.find((x) => x.variantKey === key) : p.variants[0];
  if (!v) throw new Error(`CJ 商品 ${p.pid} 没有规格 ${key}`);
  return v;
}

async function cheapestFreight(lines: { vid: string; quantity: number }[]) {
  const options = await cj.calculateFreight({ endCountryCode: "US", products: lines });
  const best = options.toSorted((a, b) => a.logisticPrice - b.logisticPrice)[0];
  if (!best) throw new Error(`没有可用物流线路：${JSON.stringify(lines)}`);
  return { cents: toCents(best.logisticPrice), name: best.logisticName, aging: best.logisticAging };
}

async function main() {
  const cache = new Map<string, cj.CJProduct>();
  for (const pid of Object.values(PID)) cache.set(pid, await cj.getProduct(pid));
  const get = (pid: string) => cache.get(pid)!;
  const resolve = (imgs: Img[]) => imgs.map((i) => (typeof i === "string" ? i : i(get))).filter((x, i, a) => a.indexOf(x) === i);
  const fee = { percent: Number(process.env.PAYMENT_FEE_PERCENT ?? 4.4), fixedCents: Number(process.env.PAYMENT_FEE_FIXED_CENTS ?? 30) };

  for (const def of CATALOG) {
    const variants: {
      name: string;
      sku: string | null;
      priceCents: number;
      costCents: number;
      shippingCostCents: number;
      supplierRef: string | null;
      components: string | null;
      image: string | null;
    }[] = [];

    if (def.kind === "single") {
      for (const v of def.variants) {
        const cv = pickVariant(get(def.pid), v.key);
        const freight = await cheapestFreight([{ vid: cv.vid, quantity: 1 }]);
        variants.push({
          name: v.name,
          sku: cv.variantSku,
          priceCents: v.priceCents,
          costCents: toCents(cv.variantSellPrice),
          shippingCostCents: freight.cents,
          supplierRef: cv.vid,
          components: null,
          image: cv.variantImage,
        });
      }
    } else {
      const parts = def.components.map((c) => ({ ...c, cv: pickVariant(get(c.pid), c.key) }));
      const freight = await cheapestFreight(parts.map((p) => ({ vid: p.cv.vid, quantity: p.quantity })));
      variants.push({
        name: "Gray",
        sku: null,
        priceCents: def.priceCents,
        costCents: parts.reduce((s, p) => s + toCents(p.cv.variantSellPrice) * p.quantity, 0),
        shippingCostCents: freight.cents,
        supplierRef: null,
        components: JSON.stringify(parts.map((p) => ({ vid: p.cv.vid, quantity: p.quantity, name: p.name }))),
        image: null,
      });
    }

    const data = {
      title: def.title,
      description: def.description,
      images: JSON.stringify(resolve(def.images)),
      tags: JSON.stringify(def.tags),
      highlights: JSON.stringify(def.highlights),
      supplier: "CJ",
      supplierRef: def.kind === "single" ? def.pid : null,
      active: true,
    };
    const existing = await db.product.findUnique({ where: { slug: def.slug }, include: { variants: true } });
    const product = existing
      ? await db.product.update({ where: { id: existing.id }, data })
      : await db.product.create({ data: { ...data, slug: def.slug } });
    for (const v of variants) {
      const match = existing?.variants.find((x) => x.name === v.name);
      if (match) await db.variant.update({ where: { id: match.id }, data: v });
      else await db.variant.create({ data: { ...v, productId: product.id } });
    }

    for (const v of variants) {
      const profit = unitProfitCents(v.priceCents, v.costCents, v.shippingCostCents, fee);
      console.log(
        `${def.title.padEnd(30)} ${v.name.padEnd(6)} 售价 $${(v.priceCents / 100).toFixed(2)}  成本 $${(v.costCents / 100).toFixed(2)}  运费 $${(v.shippingCostCents / 100).toFixed(2)}  手续费 $${(paymentFeeCents(v.priceCents, fee) / 100).toFixed(2)}  毛利 $${(profit / 100).toFixed(2)} (${Math.round((profit / v.priceCents) * 100)}%)`,
      );
    }
  }

  const { count } = await db.product.updateMany({
    where: { slug: { notIn: CATALOG.map((d) => d.slug) }, active: true },
    data: { active: false },
  });
  console.log(`已下架目录外商品 ${count} 个`);
}

main().finally(() => db.$disconnect());
