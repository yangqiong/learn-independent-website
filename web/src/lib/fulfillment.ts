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

// 把履约单推送到 CJ 下单，CJ 会从它的仓库直接发给买家
export async function placeCJOrder(fulfillmentId: string) {
  const f = await db.fulfillment.findUniqueOrThrow({
    where: { id: fulfillmentId },
    include: { order: true, items: { include: { variant: true } } },
  });
  const o = f.order;
  try {
    const products = f.items.map((i) => {
      if (!i.variant.supplierRef) throw new Error(`商品「${i.title}」没有关联 CJ vid`);
      return { vid: i.variant.supplierRef, quantity: i.quantity };
    });

    let logisticName = config.cj.logisticName;
    if (!logisticName) {
      const options = await cj.calculateFreight({ endCountryCode: o.shipCountry, zip: o.shipZip, products });
      if (!options.length) throw new Error(`CJ 没有可发往 ${o.shipCountry} 的物流`);
      logisticName = options.toSorted((a, b) => a.logisticPrice - b.logisticPrice)[0].logisticName;
    }

    const res = await cj.createOrder({
      orderNumber: `${o.id}-${f.id.slice(-6)}`,
      shippingCountryCode: o.shipCountry,
      shippingCountry: countryName(o.shipCountry),
      shippingProvince: o.shipState || o.shipCity,
      shippingCity: o.shipCity,
      shippingCustomerName: o.shipName,
      shippingAddress: o.shipLine1,
      shippingAddress2: o.shipLine2 || undefined,
      shippingZip: o.shipZip,
      shippingPhone: o.shipPhone || undefined,
      logisticName,
      fromCountryCode: config.cj.fromCountryCode,
      products,
    });

    await db.fulfillment.update({
      where: { id: f.id },
      data: { status: "PLACED", supplierOrderId: res.orderId, logisticName, error: null },
    });
    await addEvent(o.id, "CJ_PLACED", `已在 CJ 下单 ${res.orderId}（物流：${logisticName}），请到 CJ 后台付款`);
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db.fulfillment.update({ where: { id: f.id }, data: { status: "FAILED", error } });
    await addEvent(o.id, "CJ_FAILED", `CJ 下单失败：${error}`);
  }
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
