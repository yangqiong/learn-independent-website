// CJdropshipping API 2.0 封装。文档：https://developers.cjdropshipping.com/en/api/api2/
import { config } from "./config";
import { db } from "./db";

const BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const TOKEN_KEY = "cj_token";

// CJ 限制 QPS 为 1 次/秒：所有请求串行排队，间隔 1.1 秒（单进程内有效）
let lastCall = 0;
let queue: Promise<unknown> = Promise.resolve();
function throttle() {
  const turn = queue.then(async () => {
    const wait = lastCall + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
  });
  queue = turn;
  return turn;
}

type CJResponse<T> = { code: number; result: boolean; message: string; data: T };
type StoredToken = { accessToken: string; expiresAt: number; refreshToken: string; refreshExpiresAt: number };
type TokenData = {
  accessToken: string;
  accessTokenExpiryDate?: string;
  refreshToken: string;
  refreshTokenExpiryDate?: string;
};

async function requestToken(path: string, body: object): Promise<StoredToken> {
  await throttle();
  const res = await fetchWithRetry(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, 3);
  const json = (await res.json()) as CJResponse<TokenData>;
  if (!json.result) throw new Error(`CJ 获取 token 失败：${json.code} ${json.message}`);
  const d = json.data;
  const day = 24 * 3600 * 1000;
  return {
    accessToken: d.accessToken,
    expiresAt: d.accessTokenExpiryDate ? Date.parse(d.accessTokenExpiryDate) : Date.now() + 14 * day,
    refreshToken: d.refreshToken,
    refreshExpiresAt: d.refreshTokenExpiryDate ? Date.parse(d.refreshTokenExpiryDate) : Date.now() + 170 * day,
  };
}

// access token 有效期 15 天，且 CJ 限制 5 分钟内只能获取一次，所以缓存在数据库里
async function getToken() {
  if (!config.cj.apiKey) throw new Error("未配置 CJ_API_KEY");
  const row = await db.setting.findUnique({ where: { key: TOKEN_KEY } });
  const stored = row ? (JSON.parse(row.value) as StoredToken) : null;
  const hour = 3600 * 1000;
  if (stored && stored.expiresAt > Date.now() + hour) return stored.accessToken;

  const fresh =
    stored && stored.refreshExpiresAt > Date.now() + hour
      ? await requestToken("/authentication/refreshAccessToken", { refreshToken: stored.refreshToken })
      : await requestToken("/authentication/getAccessToken", { apiKey: config.cj.apiKey });
  await db.setting.upsert({
    where: { key: TOKEN_KEY },
    create: { key: TOKEN_KEY, value: JSON.stringify(fresh) },
    update: { value: JSON.stringify(fresh) },
  });
  return fresh.accessToken;
}

const RATE_LIMITED = 1600200;

// 国内网络访问 CJ 偶尔 TLS 握手失败：查询类请求自动重试；下单请求不重试，避免重复下单
async function fetchWithRetry(url: string, init: RequestInit, attempts: number) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      if (i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function cjFetch<T>(path: string, init: RequestInit = {}, retried = false, networkRetry = true): Promise<T> {
  const token = await getToken();
  await throttle();
  const res = await fetchWithRetry(
    `${BASE}${path}`,
    { ...init, headers: { "CJ-Access-Token": token, "Content-Type": "application/json" } },
    networkRetry ? 3 : 1,
  );
  const json = (await res.json()) as CJResponse<T>;
  // 多个进程同时调用（如 dev 服务器 + 脚本）仍可能被限流，重试一次
  if (json.code === RATE_LIMITED && !retried) return cjFetch(path, init, true, networkRetry);
  if (!json.result) throw new Error(`CJ ${path} 失败：${json.code} ${json.message}`);
  return json.data;
}

export type CJListItem = { id: string; nameEn: string; sku: string; bigImage: string; sellPrice: string };

export async function searchProducts(keyWord: string, page = 1) {
  const qs = new URLSearchParams({ keyWord, page: String(page), size: "20" });
  const data = await cjFetch<{ totalRecords: number; content: { productList: CJListItem[] }[] }>(
    `/product/listV2?${qs}`,
  );
  return { total: data.totalRecords, items: data.content.flatMap((c) => c.productList ?? []) };
}

export type CJProduct = {
  pid: string;
  productNameEn: string;
  productSku: string;
  bigImage: string;
  productImageSet?: string[];
  description?: string;
  sellPrice: number;
  variants: {
    vid: string;
    variantNameEn: string | null;
    variantKey: string | null;
    variantSku: string;
    variantImage: string | null;
    variantSellPrice: number;
    variantWeight?: number; // 克
  }[];
};

export const getProduct = (pid: string) => cjFetch<CJProduct>(`/product/query?pid=${encodeURIComponent(pid)}`);

export type CJFreight = { logisticName: string; logisticPrice: number; logisticAging: string };

export function calculateFreight(input: {
  endCountryCode: string;
  zip?: string;
  products: { vid: string; quantity: number }[];
}) {
  return cjFetch<CJFreight[]>("/logistic/freightCalculate", {
    method: "POST",
    body: JSON.stringify({ startCountryCode: config.cj.fromCountryCode, ...input }),
  });
}

export type CJCreateOrderInput = {
  orderNumber: string;
  shippingCountryCode: string;
  shippingCountry: string;
  shippingProvince: string;
  shippingCity: string;
  shippingCustomerName: string;
  shippingAddress: string;
  shippingAddress2?: string;
  shippingZip?: string;
  shippingPhone?: string;
  logisticName: string;
  fromCountryCode: string;
  remark?: string;
  products: { vid: string; quantity: number }[];
};

// V3 只创建订单不扣款：需要在 CJ 后台付款（或充值余额后调用 payBalance）CJ 才会发货
export const createOrder = (input: CJCreateOrderInput) =>
  cjFetch<{ orderId: string; orderStatus?: string; orderAmount?: number }>(
    "/shopping/order/createOrderV3",
    { method: "POST", body: JSON.stringify(input) },
    false,
    false,
  );

export type CJOrderDetail = {
  orderId: string;
  orderStatus: string; // CREATED / IN_CART / UNPAID / UNSHIPPED / SHIPPED / DELIVERED / CANCELLED
  logisticName?: string;
  trackNumber?: string;
  trackingProvider?: string;
  trackingUrl?: string;
};

export const getOrderDetail = (orderId: string) =>
  cjFetch<CJOrderDetail>(`/shopping/order/getOrderDetail?orderId=${encodeURIComponent(orderId)}`);
