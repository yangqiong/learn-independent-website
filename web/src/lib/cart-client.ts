"use client";

import { useSyncExternalStore } from "react";

// 购物车只存在浏览器里：[{ variantId, quantity }]
export type CartLine = { variantId: string; quantity: number };

const KEY = "cart";
const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: CartLine[] } = { raw: null, value: EMPTY };

function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cache.raw) {
    try {
      cache = { raw, value: raw ? (JSON.parse(raw) as CartLine[]) : EMPTY };
    } catch {
      cache = { raw, value: EMPTY };
    }
  }
  return cache.value;
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);

export const cart = {
  add(variantId: string, quantity = 1) {
    const lines = read();
    const hit = lines.find((l) => l.variantId === variantId);
    write(
      hit
        ? lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l))
        : [...lines, { variantId, quantity }],
    );
  },
  setQuantity(variantId: string, quantity: number) {
    write(
      quantity <= 0
        ? read().filter((l) => l.variantId !== variantId)
        : read().map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(20, quantity) } : l)),
    );
  },
  clear() {
    write([]);
  },
};

export type CartVariant = { id: string; name: string; priceCents: number; image: string | null; title: string; slug: string };

export async function fetchCartVariants(lines: CartLine[]): Promise<CartVariant[]> {
  if (!lines.length) return [];
  const res = await fetch("/api/cart", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ variantIds: lines.map((l) => l.variantId) }),
  });
  return ((await res.json()) as { variants: CartVariant[] }).variants;
}
