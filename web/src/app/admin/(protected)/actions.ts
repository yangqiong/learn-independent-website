"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { importFromCJ } from "@/lib/cj-import";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { markShipped, placeCJOrder, syncCJFulfillment } from "@/lib/fulfillment";
import { toCents } from "@/lib/money";
import { addEvent, markRefunded } from "@/lib/orders";
import { refundPayPalCapture } from "@/lib/paypal";

// ---------- 订单 / 履约 ----------

export async function shipFulfillment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("fulfillmentId"));
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  if (!trackingNumber) return;
  await markShipped(id, {
    carrier: String(formData.get("carrier") ?? "").trim() || null,
    trackingNumber,
    trackingUrl: String(formData.get("trackingUrl") ?? "").trim() || null,
  });
  revalidatePath("/admin", "layout");
}

export async function pushToCJ(formData: FormData) {
  await requireAdmin();
  await placeCJOrder(String(formData.get("fulfillmentId")));
  revalidatePath("/admin", "layout");
}

export async function syncCJ(formData: FormData) {
  await requireAdmin();
  const f = await db.fulfillment.findUniqueOrThrow({ where: { id: String(formData.get("fulfillmentId")) } });
  try {
    const status = await syncCJFulfillment(f.id);
    await addEvent(f.orderId, "CJ_SYNC", `同步 CJ 订单状态：${status ?? "-"}`);
  } catch (e) {
    await addEvent(f.orderId, "CJ_SYNC", `同步失败：${e instanceof Error ? e.message : e}`);
  }
  revalidatePath("/admin", "layout");
}

export async function refundOrder(formData: FormData) {
  await requireAdmin();
  const order = await db.order.findUniqueOrThrow({ where: { id: Number(formData.get("orderId")) } });
  try {
    if (order.paymentProvider === "paypal") {
      if (!order.captureRef) throw new Error("没有 capture id，无法退款");
      const refund = await refundPayPalCapture(order.captureRef);
      await markRefunded(order.id, `已通过 PayPal 全额退款（refund ${refund.id}，${refund.status}）`);
    } else {
      await markRefunded(order.id, "模拟退款");
    }
  } catch (e) {
    await addEvent(order.id, "REFUND_FAILED", `退款失败：${e instanceof Error ? e.message : e}`);
  }
  revalidatePath("/admin", "layout");
}

// ---------- 商品 ----------

const productSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/, "slug 只能包含小写字母、数字和 -"),
  description: z.string(),
  images: z.array(z.string().refine((u) => u.startsWith("/") || /^https?:\/\//.test(u), "图片需为 URL 或 / 开头的站内路径")),
  tags: z.array(z.string()),
  highlights: z.array(z.string()),
  active: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        sku: z.string().optional(),
        price: z.number().positive(),
        cost: z.number().nonnegative().optional(),
        shipping: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

export type ProductFormState = { error?: string };

export async function saveProduct(_: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const parsed = productSchema.safeParse(JSON.parse(String(formData.get("payload"))));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const p = parsed.data;
  const data = {
    title: p.title,
    slug: p.slug,
    description: p.description,
    images: JSON.stringify(p.images),
    tags: JSON.stringify(p.tags),
    highlights: JSON.stringify(p.highlights),
    active: p.active,
  };
  const variantData = (v: (typeof p.variants)[number]) => ({
    name: v.name,
    sku: v.sku || null,
    priceCents: toCents(v.price),
    costCents: v.cost === undefined ? null : toCents(v.cost),
    shippingCostCents: v.shipping === undefined ? null : toCents(v.shipping),
  });

  try {
    if (p.id) {
      const keepIds = p.variants.flatMap((v) => (v.id ? [v.id] : []));
      await db.$transaction([
        db.product.update({ where: { id: p.id }, data }),
        // 已有订单引用的规格不能删，只删没被用过的
        db.variant.deleteMany({ where: { productId: p.id, id: { notIn: keepIds }, orderItems: { none: {} } } }),
        ...p.variants.map((v) =>
          v.id
            ? db.variant.update({ where: { id: v.id }, data: variantData(v) })
            : db.variant.create({ data: { ...variantData(v), productId: p.id! } }),
        ),
      ]);
    } else {
      await db.product.create({ data: { ...data, variants: { create: p.variants.map(variantData) } } });
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

// ---------- CJ 选品导入 ----------

export async function importCJProduct(formData: FormData) {
  await requireAdmin();
  const markup = Number(formData.get("markup")) || config.cj.markup;
  const id = await importFromCJ(String(formData.get("pid")), markup);
  redirect(`/admin/products/${id}`);
}
