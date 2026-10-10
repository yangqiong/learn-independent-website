// 示例商品（手动发货类）。运行：pnpm db:seed
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const products = [
  {
    slug: "canvas-tote-bag",
    title: "Canvas Tote Bag",
    description: "Heavyweight 12oz cotton canvas.\nFits a 15\" laptop. Reinforced handles.",
    images: ["/products/tote.svg", "/products/tote-black.svg"],
    variants: [
      { name: "Natural", sku: "TOTE-NAT", priceCents: 2400, costCents: 650 },
      { name: "Black", sku: "TOTE-BLK", priceCents: 2400, costCents: 650 },
    ],
  },
  {
    slug: "ceramic-mug",
    title: "Ceramic Mug",
    description: "Stoneware mug, 350ml. Dishwasher and microwave safe.",
    images: ["/products/mug.svg"],
    variants: [{ name: "Default", sku: "MUG-01", priceCents: 1800, costCents: 420 }],
  },
  {
    slug: "linen-cap",
    title: "Linen Cap",
    description: "Washed linen six-panel cap with adjustable strap.",
    images: ["/products/cap.svg"],
    variants: [
      { name: "S/M", sku: "CAP-SM", priceCents: 2200, costCents: 580 },
      { name: "L/XL", sku: "CAP-LX", priceCents: 2200, costCents: 580 },
    ],
  },
];

async function main() {
  for (const p of products) {
    const { variants, images, ...rest } = p;
    await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: { ...rest, images: JSON.stringify(images), variants: { create: variants } },
    });
  }
  console.log(`Seeded ${products.length} products`);
}

main().finally(() => db.$disconnect());
