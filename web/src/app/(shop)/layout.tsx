import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { config, isFreeShipping } from "@/lib/config";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {isFreeShipping() && (
        <div className="bg-stone-900 py-2 text-center text-xs font-medium tracking-wide text-white">FREE SHIPPING ON ALL ORDERS</div>
      )}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            {config.siteName}
          </Link>
          <CartLink />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        © {config.siteName} · {isFreeShipping() ? "Free worldwide shipping on every order" : `Free shipping over $${config.freeShippingOverCents / 100}`}
      </footer>
    </>
  );
}
