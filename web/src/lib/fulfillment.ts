import * as cj from "./cj";
import { config, cjConfigured } from "./config";
import { db } from "./db";
import { sendShippedNotice } from "./email";
import { countryName } from "./money";
import { addEvent } from "./orders";

const trackingLink = (no: string) => `https://t.17track.net/en#nums=${encodeURIComponent(no)}`;

// 支付成功后：按供应商把订单商品拆成多个履约单
export async function dispatchFulfillments(orderId: number) {
  const items = await db.orderItem.findMany({ where: { orderId, fulfillmentId: null } });
  const bySupplier = Map.groupBy(items, (i) => i.supplier);

  for (const [supplier, group] of bySupplier) {
    const f = await db.fulfillment.create({
      data: { orderId, supplier, items: { connect: group.map((i) => ({ id: i.id })) } },
    });
    await addEvent(orderId, "FULFILLMENT", `创建 ${supplier} 履约单（${group.length} 个商品）`);
    if (supplier === "CJ" && config.cj.autoOrder && cjConfigured()) await placeCJOrder(f.id);
  }
  await db.order.update({ where: { id: orderId }, data: { status: "FULFILLING" } });
}

type CJLine = { vid: string; quantity: number };
type ItemWithVariant = { id: string; title: string; quantity: number; variant: { supplierRef: string | null; components: string | null } };

// 订单行 → CJ 商品行：套装展开成多个 CJ 商品，数量相乘
function cjLinesFor(item: ItemWithVariant): CJLine[] {
  if (item.variant.components) {
    const parts = JSON.parse(item.variant.components) as CJLine[];
    return parts.map((p) => ({ vid: p.vid, quantity: p.quantity * item.quantity }));
  }
  if (!item.variant.supplierRef) throw new Error(`商品「${item.title}」没有关联 CJ vid`);
  return [{ vid: item.variant.supplierRef, quantity: item.quantity }];
}

function mergeLines(lines: CJLine[]) {
  const map = new Map<string, number>();
  for (const l of lines) map.set(l.vid, (map.get(l.vid) ?? 0) + l.quantity);
  return [...map].map(([vid, quantity]) => ({ vid, quantity }));
}

async function pickLogistic(country: string, zip: string, products: CJLine[]) {
  const options = await cj.calculateFreight({ endCountryCode: country, zip, products });
  if (config.cj.logisticName) return options.find((o) => o.logisticName === config.cj.logisticName) ?? null;
  return options.toSorted((a, b) => a.logisticPrice - b.logisticPrice)[0] ?? null;
}

// 不同仓库的商品没有共同物流线路（如供应商直发 + CJ 仓）：贪心分组，能合并的放一个包裹
export async function groupByRoute<T extends ItemWithVariant>(items: T[], country: string, zip: string) {
  const groups: { items: T[]; lines: CJLine[]; logisticName: string }[] = [];
  for (const item of items) {
    const lines = cjLinesFor(item);
    let placed = false;
    for (const g of groups) {
      const merged = mergeLines([...g.lines, ...lines]);
      const route = await pickLogistic(country, zip, merged);
      if (route) {
        g.items.push(item);
        g.lines = merged;
        g.logisticName = route.logisticName;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const merged = mergeLines(lines);
      const route = await pickLogistic(country, zip, merged);
      if (!route) throw new Error(`「${item.title}」没有可发往 ${country} 的 CJ 物流线路`);
      groups.push({ items: [item], lines: merged, logisticName: route.logisticName });
    }
  }
  return groups;
}

// 把履约单推送到 CJ 下单，CJ 会从它的仓库直接发给买家；无法合并发货时自动拆成多个包裹
export async function placeCJOrder(fulfillmentId: string) {
  const f = await db.fulfillment.findUniqueOrThrow({
    where: { id: fulfillmentId },
    include: { order: true, items: { include: { variant: true } } },
  });
  const o = f.order;
  let groups: Awaited<ReturnType<typeof groupByRoute<(typeof f.items)[number]>>>;
  try {
    groups = await groupByRoute(f.items, o.shipCountry, o.shipZip);
  } catch (e) {
    return failFulfillment(f.id, o.id, e);
  }

  // 第一组留在当前履约单，其余各建一个新履约单
  const targets = [{ id: f.id, group: groups[0] }];
  for (const group of groups.slice(1)) {
    const extra = await db.fulfillment.create({
      data: { orderId: o.id, supplier: "CJ", items: { connect: group.items.map((i) => ({ id: i.id })) } },
    });
    targets.push({ id: extra.id, group });
  }
  if (groups.length > 1) {
    await addEvent(o.id, "CJ_SPLIT", `商品来自不同仓库，无法合并发货，拆分为 ${groups.length} 个 CJ 包裹`);
  }

  for (const { id, group } of targets) {
    try {
      const res = await cj.createOrder({
        orderNumber: `${o.id}-${id.slice(-6)}`,
        shippingCountryCode: o.shipCountry,
        shippingCountry: countryName(o.shipCountry),
        shippingProvince: o.shipState || o.shipCity,
        shippingCity: o.shipCity,
        shippingCustomerName: o.shipName,
        shippingAddress: o.shipLine1,
        shippingAddress2: o.shipLine2 || undefined,
        shippingZip: o.shipZip,
        shippingPhone: o.shipPhone || undefined,
        logisticName: group.logisticName,
        fromCountryCode: config.cj.fromCountryCode,
        products: group.lines,
      });
      await db.fulfillment.update({
        where: { id },
        data: { status: "PLACED", supplierOrderId: res.orderId, logisticName: group.logisticName, error: null },
      });
      await addEvent(o.id, "CJ_PLACED", `已在 CJ 下单 ${res.orderId}（物流：${group.logisticName}），请到 CJ 后台付款`);
    } catch (e) {
      await failFulfillment(id, o.id, e);
    }
  }
}

async function failFulfillment(fulfillmentId: string, orderId: number, e: unknown) {
  const error = e instanceof Error ? e.message : String(e);
  await db.fulfillment.update({ where: { id: fulfillmentId }, data: { status: "FAILED", error } });
  await addEvent(orderId, "CJ_FAILED", `CJ 下单失败：${error}`);
}

// 向 CJ 查询物流单号，有了就标记发货
export async function syncCJFulfillment(fulfillmentId: string) {
  const f = await db.fulfillment.findUniqueOrThrow({ where: { id: fulfillmentId } });
  if (f.supplier !== "CJ" || f.status !== "PLACED" || !f.supplierOrderId) return null;
  const detail = await cj.getOrderDetail(f.supplierOrderId);
  if (detail.trackNumber) {
    await markShipped(f.id, {
      carrier: detail.trackingProvider || detail.logisticName || f.logisticName,
      trackingNumber: detail.trackNumber,
      trackingUrl: detail.trackingUrl || null,
    });
  }
  return detail.orderStatus;
}

export async function syncAllCJ() {
  const pending = await db.fulfillment.findMany({ where: { supplier: "CJ", status: "PLACED" } });
  const results = [];
  for (const f of pending) {
    try {
      results.push({ id: f.id, status: await syncCJFulfillment(f.id) });
    } catch (e) {
      results.push({ id: f.id, error: String(e) });
    }
  }
  return results;
}

export async function markShipped(
  fulfillmentId: string,
  input: { carrier: string | null; trackingNumber: string; trackingUrl: string | null },
) {
  const trackingUrl = input.trackingUrl || trackingLink(input.trackingNumber);
  const f = await db.fulfillment.update({
    where: { id: fulfillmentId },
    data: { status: "SHIPPED", carrier: input.carrier, trackingNumber: input.trackingNumber, trackingUrl, shippedAt: new Date() },
  });
  await addEvent(f.orderId, "SHIPPED", `${f.supplier} 履约单已发货：${input.carrier ?? ""} ${input.trackingNumber}`);

  const order = await db.order.findUniqueOrThrow({
    where: { id: f.orderId },
    include: { items: true, fulfillments: true },
  });
  await sendShippedNotice(order, { carrier: input.carrier, trackingNumber: input.trackingNumber, trackingUrl });
  await addEvent(order.id, "EMAIL", "已发送发货通知邮件");

  if (order.status === "FULFILLING" && order.fulfillments.every((x) => x.status === "SHIPPED")) {
    await db.order.update({ where: { id: order.id }, data: { status: "SHIPPED" } });
  }
}
