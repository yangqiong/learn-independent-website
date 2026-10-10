"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cart, fetchCartVariants, useCart, type CartVariant } from "@/lib/cart-client";
import { formatMoney } from "@/lib/money";

export function CartView({ freeShipping }: { freeShipping: boolean }) {
  const lines = useCart();
  const [variants, setVariants] = useState<CartVariant[] | null>(null);
  const ids = lines.map((l) => l.variantId).join(",");

  useEffect(() => {
    fetchCartVariants(lines).then(setVariants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  const rows = lines.flatMap((l) => {
    const v = variants?.find((x) => x.id === l.variantId);
    return v ? [{ ...v, quantity: l.quantity }] : [];
  });
  const subtotal = rows.reduce((s, r) => s + r.priceCents * r.quantity, 0);

  if (!lines.length) {
    return (
      <div className="px-5 py-24 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/" className="btn mt-4">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="h-section mb-6">Your cart</h1>
      {variants === null && <p className="text-sm text-muted">Loading…</p>}
      <ul className="divide-y divide-line border-y border-line">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-4 py-4">
            {r.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.image} alt="" className="h-16 w-16 rounded bg-sand object-cover" />
            )}
            <div className="flex-1">
              <Link href={`/products/${r.slug}`} className="text-sm font-medium">{r.title}</Link>
              <div className="text-xs text-muted">{r.name}</div>
            </div>
            <input
              type="number"
              min={0}
              max={20}
              value={r.quantity}
              onChange={(e) => cart.setQuantity(r.id, Number(e.target.value))}
              className="input w-16"
            />
            <div className="w-20 text-right text-sm">{formatMoney(r.priceCents * r.quantity)}</div>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm">
          Subtotal <span className="ml-2 font-semibold">{formatMoney(subtotal)}</span>
          <div className="text-xs text-muted">{freeShipping ? "Free US shipping included" : "Shipping calculated at checkout"}</div>
        </div>
        <Link href="/checkout" className="btn">Checkout</Link>
      </div>
    </div>
  );
}
