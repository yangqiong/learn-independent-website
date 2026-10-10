import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shippingFor } from "@/lib/orders";

// 购物车存在浏览器 localStorage，这里按 variantId 返回最新的商品信息和价格
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { variantIds?: unknown } | null;
  const variantIds = Array.isArray(body?.variantIds) ? body.variantIds.map(String) : [];
  const variants = await db.variant.findMany({
    where: { id: { in: variantIds }, product: { active: true } },
    include: { product: true },
  });
  return NextResponse.json({
    variants: variants.map((v) => ({
      id: v.id,
      name: v.name,
      priceCents: v.priceCents,
      image: v.image ?? (JSON.parse(v.product.images) as string[])[0] ?? null,
      title: v.product.title,
      slug: v.product.slug,
    })),
  });
}

export async function GET(req: Request) {
  const subtotal = Number(new URL(req.url).searchParams.get("subtotal") ?? 0);
  return NextResponse.json({ shippingCents: shippingFor(subtotal) });
}
