"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-client";

export function CartLink() {
  const count = useCart().reduce((s, l) => s + l.quantity, 0);
  return (
    <Link href="/cart" className="text-sm font-medium hover:underline">
      Cart{count > 0 && <span className="ml-1 rounded-full bg-stone-900 px-2 py-0.5 text-xs text-white">{count}</span>}
    </Link>
  );
}
