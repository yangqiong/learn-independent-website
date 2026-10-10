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
    <div className="mt-4">
      <div className="text-xl">{formatMoney(variant.priceCents)}</div>
      {variants.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v.id)}
              className={`rounded-md border px-3 py-1.5 text-sm ${v.id === selected ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
      <div className="mt-6 flex items-center gap-3">
        <button
          className="btn"
          onClick={() => {
            cart.add(variant.id);
            setAdded(true);
          }}
        >
          Add to cart
        </button>
        {added && (
          <Link href="/cart" className="text-sm underline">
            Added — view cart
          </Link>
        )}
      </div>
    </div>
  );
}
