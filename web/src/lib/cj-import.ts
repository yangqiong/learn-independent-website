// 从 CJ 导入商品：拉取详情 → 按重量试算运费 → 计算售价（全站包邮，运费计入售价）
import * as cj from "./cj";
import { config } from "./config";
import { db } from "./db";
import { toCents } from "./money";
import { suggestPriceCents } from "./pricing";

const stripHtml = (html: string) =>
  html
    .replace(/<(br|\/p|\/div|\/li)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "product";

// 运费按重量算：同重量的规格只试算一次，取发往目标国家最便宜（或指定）的线路
async function estimateFreightByWeight(p: cj.CJProduct) {
  const byWeight = new Map<number, string>();
  for (const v of p.variants) if (!byWeight.has(v.variantWeight ?? 0)) byWeight.set(v.variantWeight ?? 0, v.vid);

  const result = new Map<number, number>();
  for (const [weight, vid] of byWeight) {
    try {
      const options = await cj.calculateFreight({ endCountryCode: config.cj.shipTo, products: [{ vid, quantity: 1 }] });
      const picked = config.cj.logisticName
        ? options.find((o) => o.logisticName === config.cj.logisticName)
        : options.toSorted((a, b) => a.logisticPrice - b.logisticPrice)[0];
      if (picked) result.set(weight, toCents(picked.logisticPrice));
    } catch (e) {
      // 试算失败不阻断导入：运费留空，商品是下架状态，编辑页会提示补填
      console.error(`CJ 运费试算失败 vid=${vid}`, e);
    }
  }
  return result;
}

// 返回商品 id；同一个 CJ 商品重复导入时直接返回已有的
export async function importFromCJ(pid: string, markup = config.cj.markup) {
  const existing = await db.product.findFirst({ where: { supplier: "CJ", supplierRef: pid } });
  if (existing) return existing.id;

  const p = await cj.getProduct(pid);
  const freight = await estimateFreightByWeight(p);
  const images = [p.bigImage, ...(p.productImageSet ?? [])].filter((x, i, a) => x && a.indexOf(x) === i).slice(0, 8);

  const product = await db.product.create({
    data: {
      title: p.productNameEn,
      slug: `${slugify(p.productNameEn)}-${pid.slice(-6).toLowerCase()}`,
      description: stripHtml(p.description ?? ""),
      images: JSON.stringify(images),
      supplier: "CJ",
      supplierRef: pid,
      active: false, // 导入后先下架，检查标题/价格后再上架
      variants: {
        create: p.variants.map((v) => {
          const costCents = toCents(v.variantSellPrice);
          const shippingCostCents = freight.get(v.variantWeight ?? 0) ?? null;
          return {
            name: v.variantKey || v.variantNameEn || "Default",
            sku: v.variantSku,
            costCents,
            shippingCostCents,
            priceCents: suggestPriceCents(costCents, shippingCostCents ?? 0, markup),
            supplierRef: v.vid,
            image: v.variantImage,
          };
        }),
      },
    },
  });
  return product.id;
}
