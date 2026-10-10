"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cart, fetchCartVariants, useCart, type CartVariant } from "@/lib/cart-client";
import { countryName, formatMoney } from "@/lib/money";

type Props = {
  provider: "paypal" | "mock";
  countries: string[];
  paypalClientId: string;
  currency: string;
  shippingFlatCents: number;
  freeShippingOverCents: number;
};

const FIELDS = [
  ["name", "Full name"], ["phone", "Phone"], ["line1", "Address"], ["line2", "Apartment, suite (optional)"],
  ["city", "City"], ["state", "State / Province"], ["zip", "ZIP / Postal code"],
] as const;

export function CheckoutForm(props: Props) {
  const router = useRouter();
  const lines = useCart();
  const [variants, setVariants] = useState<CartVariant[]>([]);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState({ name: "", phone: "", line1: "", line2: "", city: "", state: "", zip: "", country: props.countries[0] ?? "US" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const orderRef = useRef<{ orderId: number; token: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const ids = lines.map((l) => l.variantId).join(",");
  useEffect(() => {
    fetchCartVariants(lines).then(setVariants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const rows = lines.flatMap((l) => {
    const v = variants.find((x) => x.id === l.variantId);
    return v ? [{ ...v, quantity: l.quantity }] : [];
  });
  const subtotal = rows.reduce((s, r) => s + r.priceCents * r.quantity, 0);
  const shipping = subtotal >= props.freeShippingOverCents ? 0 : props.shippingFlatCents;

  // 第 1 步：在我们自己的后端创建订单（PayPal 模式下顺便创建 PayPal 订单）
  async function createOrder() {
    setError("");
    if (!formRef.current?.reportValidity()) throw new Error("Please complete the shipping form");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, address, items: lines }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Checkout failed");
    orderRef.current = { orderId: json.orderId, token: json.token };
    return json.paypalOrderId as string | null;
  }

  // 第 2 步：付款确认后让后端扣款，成功后跳到订单页
  async function capture() {
    const res = await fetch("/api/payments/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderRef.current),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Payment failed");
    cart.clear();
    router.push(json.redirectUrl);
  }

  async function mockPay() {
    setBusy(true);
    try {
      await createOrder();
      await capture();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (!lines.length) return <p className="py-16 text-center text-stone-500">Your cart is empty.</p>;

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_320px]">
      <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <h2 className="pt-2 font-medium">Shipping address</h2>
        <div>
          <label className="label">Country</label>
          <select className="input" value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })}>
            {props.countries.map((code) => <option key={code} value={code}>{countryName(code)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(([key, label]) => (
            <div key={key} className={key === "line1" || key === "line2" ? "col-span-2" : ""}>
              <label className="label">{label}</label>
              <input
                className="input"
                required={!["line2", "state", "phone"].includes(key)}
                value={address[key]}
                onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </form>

      <aside className="h-fit rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="mb-3 font-medium">Order summary</h2>
        <ul className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex justify-between gap-2">
              <span>{r.title} · {r.name} × {r.quantity}</span>
              <span>{formatMoney(r.priceCents * r.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-stone-200 pt-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(subtotal)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{shipping ? formatMoney(shipping) : "Free"}</span></div>
          <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{formatMoney(subtotal + shipping)}</span></div>
        </div>

        <div className="mt-5">
          {props.provider === "paypal" ? (
            <PayPalScriptProvider options={{ clientId: props.paypalClientId, currency: props.currency, intent: "capture" }}>
              <PayPalButtons
                style={{ layout: "vertical", shape: "rect" }}
                createOrder={async () => {
                  try {
                    const id = await createOrder();
                    if (!id) throw new Error("PayPal order not created");
                    return id;
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                    throw e;
                  }
                }}
                onApprove={async () => {
                  try {
                    await capture();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : String(e));
                  }
                }}
                onCancel={() => setError("Payment cancelled")}
              />
            </PayPalScriptProvider>
          ) : (
            <>
              <button className="btn w-full" disabled={busy} onClick={mockPay}>
                {busy ? "Processing…" : `Pay ${formatMoney(subtotal + shipping)} (mock)`}
              </button>
              <p className="mt-2 text-xs text-stone-500">未配置 PayPal，当前为模拟支付</p>
            </>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>
      </aside>
    </div>
  );
}
