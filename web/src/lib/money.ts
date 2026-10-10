export function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

// PayPal 等接口要的金额字符串，如 "12.50"
export const toAmount = (cents: number) => (cents / 100).toFixed(2);

export const toCents = (amount: number | string) => Math.round(Number(amount) * 100);

export function countryName(code: string) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
