// PayPal Orders v2 REST 封装。文档：https://developer.paypal.com/docs/api/orders/v2/
import { config } from "./config";
import { toAmount } from "./money";

const base = () => (config.paypal.live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com");

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const auth = Buffer.from(`${config.paypal.clientId}:${config.paypal.clientSecret}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function paypalFetch<T>(path: string, init: RequestInit & { requestId?: string } = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal ${path} failed: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

type OrderForPayPal = {
  id: number;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  items: { title: string; variantName: string; unitCents: number; quantity: number }[];
};

export async function createPayPalOrder(order: OrderForPayPal) {
  const currency_code = order.currency;
  const res = await paypalFetch<{ id: string }>("/v2/checkout/orders", {
    method: "POST",
    requestId: `create-${order.id}`,
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: String(order.id), // 回调时用它对回我们自己的订单
          description: `${config.siteName} order #${order.id}`,
          amount: {
            currency_code,
            value: toAmount(order.totalCents),
            breakdown: {
              item_total: { currency_code, value: toAmount(order.subtotalCents) },
              shipping: { currency_code, value: toAmount(order.shippingCents) },
            },
          },
          items: order.items.map((i) => ({
            name: `${i.title} - ${i.variantName}`.slice(0, 127),
            quantity: String(i.quantity),
            unit_amount: { currency_code, value: toAmount(i.unitCents) },
          })),
        },
      ],
      // 收货地址由我们自己的结账页收集，PayPal 页面不再要求填写
      application_context: { shipping_preference: "NO_SHIPPING", brand_name: config.siteName },
    }),
  });
  return res.id;
}

export type PayPalCapture = {
  id: string;
  status: string;
  purchase_units: {
    custom_id?: string;
    payments: { captures: { id: string; status: string; amount: { currency_code: string; value: string } }[] };
  }[];
};

export async function capturePayPalOrder(paypalOrderId: string) {
  return paypalFetch<PayPalCapture>(`/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    requestId: `capture-${paypalOrderId}`, // 幂等：重复调用不会重复扣款
  });
}

export async function refundPayPalCapture(captureId: string) {
  return paypalFetch<{ id: string; status: string }>(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    requestId: `refund-${captureId}`,
    body: "{}",
  });
}

// Webhook 验签：https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
export async function verifyPayPalWebhook(headers: Headers, event: unknown) {
  if (!config.paypal.webhookId) return false;
  const res = await paypalFetch<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: headers.get("paypal-auth-algo"),
      cert_url: headers.get("paypal-cert-url"),
      transmission_id: headers.get("paypal-transmission-id"),
      transmission_sig: headers.get("paypal-transmission-sig"),
      transmission_time: headers.get("paypal-transmission-time"),
      webhook_id: config.paypal.webhookId,
      webhook_event: event,
    }),
  });
  return res.verification_status === "SUCCESS";
}
