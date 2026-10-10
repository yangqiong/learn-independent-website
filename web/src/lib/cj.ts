// CJdropshipping API 2.0 封装。文档：https://developers.cjdropshipping.com/en/api/api2/
import { config } from "./config";
import { db } from "./db";

const BASE = "https://developers.cjdropshipping.com/api2.0/v1";
const TOKEN_KEY = "cj_token";

type CJResponse<T> = { code: number; result: boolean; message: string; data: T };
type StoredToken = { accessToken: string; expiresAt: number; refreshToken: string; refreshExpiresAt: number };
type TokenData = {
  accessToken: string;
  accessTokenExpiryDate?: string;
  refreshToken: string;
  refreshTokenExpiryDate?: string;
};

async function requestToken(path: string, body: object): Promise<StoredToken> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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

async function cjFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "CJ-Access-Token": await getToken(), "Content-Type": "application/json" },
  });
  const json = (await res.json()) as CJResponse<T>;
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
  cjFetch<{ orderId: string; orderStatus?: string; orderAmount?: number }>("/shopping/order/createOrderV3", {
    method: "POST",
    body: JSON.stringify(input),
  });

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
