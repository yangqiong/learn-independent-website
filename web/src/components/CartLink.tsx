"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-client";
import { BagIcon } from "./Icons";

export function CartLink() {
  const count = useCart().reduce((s, l) => s + l.quantity, 0);
  return (
    <Link href="/cart" className="relative inline-flex items-center gap-1.5 text-sm font-medium" aria-label="Cart">
      <BagIcon />
      {count > 0 && (
        <span className="absolute -right-2.5 -top-2 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
