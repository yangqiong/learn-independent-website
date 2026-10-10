import { config } from "./config";
import { db } from "./db";
import { formatMoney } from "./money";

// 所有邮件先写入 EmailLog（后台“发件箱”可查看）；配置了 RESEND_API_KEY 才真正发送
export async function sendEmail(to: string, subject: string, html: string) {
  const log = await db.emailLog.create({ data: { to, subject, html } });
  if (!config.mail.resendApiKey) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.mail.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.mail.from, to, subject, html }),
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    await db.emailLog.update({ where: { id: log.id }, data: { status: "SENT" } });
  } catch (e) {
    await db.emailLog.update({ where: { id: log.id }, data: { status: "FAILED", error: String(e) } });
  }
}

type MailOrder = {
  id: number;
  token: string;
  email: string;
  currency: string;
  totalCents: number;
  shipName: string;
  items: { title: string; variantName: string; quantity: number; unitCents: number }[];
};

const orderUrl = (o: { id: number; token: string }) => `${config.baseUrl}/orders/${o.id}?token=${o.token}`;

const layout = (body: string) =>
  `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#111">
    <h2 style="margin-bottom:4px">${config.siteName}</h2>${body}</div>`;

export function sendOrderConfirmation(order: MailOrder) {
  const rows = order.items
    .map((i) => `<li>${i.title} (${i.variantName}) × ${i.quantity} — ${formatMoney(i.unitCents * i.quantity, order.currency)}</li>`)
    .join("");
  return sendEmail(
    order.email,
    `Order #${order.id} confirmed`,
    layout(`<p>Hi ${order.shipName}, thanks for your order! We'll email you again when it ships.</p>
      <ul>${rows}</ul><p><b>Total: ${formatMoney(order.totalCents, order.currency)}</b></p>
      <p><a href="${orderUrl(order)}">View your order</a></p>`),
  );
}

export function sendShippedNotice(
  order: MailOrder,
  shipment: { carrier: string | null; trackingNumber: string; trackingUrl: string | null },
) {
  return sendEmail(
    order.email,
    `Order #${order.id} has shipped`,
    layout(`<p>Hi ${order.shipName}, good news — part or all of your order is on its way.</p>
      <p>Carrier: ${shipment.carrier ?? "-"}<br/>Tracking number: <b>${shipment.trackingNumber}</b></p>
      ${shipment.trackingUrl ? `<p><a href="${shipment.trackingUrl}">Track your package</a></p>` : ""}
      <p><a href="${orderUrl(order)}">View your order</a></p>`),
  );
}

export function sendRefundNotice(order: MailOrder) {
  return sendEmail(
    order.email,
    `Order #${order.id} refunded`,
    layout(`<p>Hi ${order.shipName}, your order has been refunded (${formatMoney(order.totalCents, order.currency)}).
      It may take a few days to appear on your statement.</p>`),
  );
}
