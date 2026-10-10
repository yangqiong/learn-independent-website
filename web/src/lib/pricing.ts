// 定价与毛利（纯函数，前后端都能用）

// 售价 = 成本 × 加价倍数 + 运费，向上取整到 x.99
export function suggestPriceCents(costCents: number, shippingCostCents: number, markup: number) {
  return Math.max(99, Math.ceil((costCents * markup + shippingCostCents) / 100) * 100 - 1);
}

export type FeeRule = { percent: number; fixedCents: number };

export const paymentFeeCents = (amountCents: number, fee: FeeRule) =>
  Math.round((amountCents * fee.percent) / 100) + fee.fixedCents;

// 单件毛利 = 售价 − 商品成本 − 运费 − 支付手续费
export function unitProfitCents(priceCents: number, costCents: number, shippingCostCents: number, fee: FeeRule) {
  return priceCents - costCents - shippingCostCents - paymentFeeCents(priceCents, fee);
}
