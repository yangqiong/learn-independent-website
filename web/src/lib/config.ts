// 所有外部服务都是“可选”的：没配置时自动降级为本地模拟，保证流程能先跑通
const env = process.env;

const paypalConfigured = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

export const config = {
  siteName: env.SITE_NAME ?? "Demo Store",
  baseUrl: env.BASE_URL ?? "http://localhost:3000",
  currency: "USD",
  shippingFlatCents: Number(env.SHIPPING_FLAT_CENTS ?? 499),
  freeShippingOverCents: Number(env.FREE_SHIPPING_OVER_CENTS ?? 5000),

  // paypal：走 PayPal（沙箱/正式）；mock：本地模拟支付，仅在未配置 PayPal 时可用
  paymentProvider: (env.PAYMENT_PROVIDER ?? (paypalConfigured ? "paypal" : "mock")) as "paypal" | "mock",
  paypal: {
    clientId: env.PAYPAL_CLIENT_ID ?? "",
    clientSecret: env.PAYPAL_CLIENT_SECRET ?? "",
    live: env.PAYPAL_ENV === "live",
    webhookId: env.PAYPAL_WEBHOOK_ID ?? "",
  },

  cj: {
    apiKey: env.CJ_API_KEY ?? "",
    // true：买家付款后自动在 CJ 创建订单；false：在后台手动点“推送到 CJ”
    autoOrder: env.CJ_AUTO_ORDER === "true",
    // 留空则按运费试算结果自动选最便宜的物流
    logisticName: env.CJ_LOGISTIC_NAME ?? "",
    fromCountryCode: env.CJ_FROM_COUNTRY ?? "CN",
    // 导入商品时的默认加价倍数：售价 = 成本 × markup
    markup: Number(env.CJ_MARKUP ?? 2.5),
  },

  mail: {
    resendApiKey: env.RESEND_API_KEY ?? "",
    from: env.MAIL_FROM ?? "Demo Store <onboarding@resend.dev>",
  },

  adminPassword: env.ADMIN_PASSWORD ?? "admin",
  sessionSecret: env.SESSION_SECRET ?? "dev-secret-change-me",
  cronSecret: env.CRON_SECRET ?? "",
};

export const cjConfigured = () => Boolean(config.cj.apiKey);
