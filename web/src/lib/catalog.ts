import type { Product, Variant } from "@prisma/client";

export type ProductWithVariants = Product & { variants: Variant[] };

const parse = <T,>(json: string | null | undefined, fallback: T): T => {
  try {
    return json ? (JSON.parse(json) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const productImages = (p: Product) => parse<string[]>(p.images, []);
export const productTags = (p: Product) => parse<string[]>(p.tags, []);
export const productHighlights = (p: Product) => parse<string[]>(p.highlights, []);
export const minPrice = (p: ProductWithVariants) => Math.min(...p.variants.map((v) => v.priceCents));

// 套装里包含的单品名称（取第一个规格）
export function kitContents(p: ProductWithVariants) {
  const parts = parse<{ name?: string; quantity: number }[]>(p.variants[0]?.components, []);
  return parts.filter((x) => x.name).map((x) => (x.quantity > 1 ? `${x.quantity} × ${x.name}` : x.name!));
}

export const hasTag = (p: Product, tag: string) => productTags(p).includes(tag);
