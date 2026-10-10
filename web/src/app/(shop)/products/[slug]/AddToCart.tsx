"use client";

import Link from "next/link";
import { useState } from "react";
import { cart } from "@/lib/cart-client";
import { formatMoney } from "@/lib/money";

type V = { id: string; name: string; priceCents: number };

export function AddToCart({ variants }: { variants: V[] }) {
  const [selected, setSelected] = useState(variants[0]?.id);
  const [added, setAdded] = useState(false);
  const variant = variants.find((v) => v.id === selected);
  if (!variant) return null;

  return (
    <div className="space-y-5">
      <div className="text-2xl">{formatMoney(variant.priceCents)}</div>
      {variants.length > 1 && (
        <div>
          <div className="label">Color: <span className="text-ink">{variant.name}</span></div>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelected(v.id)}
                className={`rounded-full border px-4 py-1.5 text-sm ${v.id === selected ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-ink"}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <button
        className="btn-accent w-full py-4 text-base"
        onClick={() => {
          cart.add(variant.id);
          setAdded(true);
        }}
      >
        Add to cart
      </button>
      {added && (
        <p className="text-center text-sm">
          Added to your cart · <Link href="/cart" className="underline underline-offset-4">View cart & checkout</Link>
        </p>
      )}
    </div>
  );
}
