// 所有外部服务都是“可选”的：没配置时自动降级为本地模拟，保证流程能先跑通
const env = process.env;

const paypalConfigured = Boolean(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET);

export const config = {
  siteName: env.SITE_NAME ?? "Demo Store",
  baseUrl: env.BASE_URL ?? "http://localhost:3000",
  currency: "USD",
  // 默认全站包邮：运费在导入定价时已计入售价。想收运费可设 SHIPPING_FLAT_CENTS
  shippingFlatCents: Number(env.SHIPPING_FLAT_CENTS ?? 0),
  freeShippingOverCents: Number(env.FREE_SHIPPING_OVER_CENTS ?? 0),
  // 用于估算毛利的支付手续费（PayPal 跨境收款大致 4.4% + $0.30，以你的账户实际费率为准）
  paymentFeePercent: Number(env.PAYMENT_FEE_PERCENT ?? 4.4),
  paymentFeeFixedCents: Number(env.PAYMENT_FEE_FIXED_CENTS ?? 30),

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
    // 导入定价：售价 = 成本 × markup + 发往 shipTo 的最便宜运费（全站包邮）
    markup: Number(env.CJ_MARKUP ?? 2.5),
    shipTo: env.CJ_SHIP_TO ?? "US",
  },

  mail: {
    resendApiKey: env.RESEND_API_KEY ?? "",
    from: env.MAIL_FROM ?? "Demo Store <onboarding@resend.dev>",
  },

  adminPassword: env.ADMIN_PASSWORD ?? "admin",
  sessionSecret: env.SESSION_SECRET ?? "dev-secret-change-me",
  cronSecret: env.CRON_SECRET ?? "",
};

export const isFreeShipping = () => config.shippingFlatCents === 0;

export const feeRule = () => ({ percent: config.paymentFeePercent, fixedCents: config.paymentFeeFixedCents });

export const cjConfigured = () => Boolean(config.cj.apiKey);
