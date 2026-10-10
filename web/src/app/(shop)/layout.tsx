import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { config } from "@/lib/config";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
        © {config.siteName} · Free shipping over ${config.freeShippingOverCents / 100}
      </footer>
    </>
  );
}
