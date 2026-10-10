import Link from "next/link";
import { CartLink } from "@/components/CartLink";
import { Logo } from "@/components/Logo";
import { config, isFreeShipping } from "@/lib/config";

const FOOTER = [
  { title: "Shop", links: [["/#kits", "Travel kits"], ["/#tech", "Tech organizers"], ["/#trips", "Shop by trip"]] },
  { title: "Help", links: [["/help/shipping", "Shipping"], ["/help/returns", "Returns"], ["/#faq", "FAQ"], ["/help/contact", "Contact us"]] },
  { title: "Company", links: [["/help/about", "About"], ["/help/privacy", "Privacy policy"], ["/help/terms", "Terms of service"]] },
];

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-ink py-2 text-center text-[11px] font-medium uppercase tracking-[0.16em] text-white">
        {isFreeShipping() ? "Free US shipping" : "Fast shipping"} · 30-day returns
      </div>
      <header className="sticky top-0 z-20 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo name={config.siteName} />
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/#kits" className="hidden hover:text-accent sm:inline">Kits</Link>
            <Link href="/#tech" className="hidden hover:text-accent sm:inline">Tech</Link>
            <Link href="/#faq" className="hidden hover:text-accent sm:inline">Help</Link>
            <CartLink />
          </nav>
        </div>
      </header>
      <main className="w-full flex-1">{children}</main>
      <footer className="mt-24 border-t border-line bg-sand">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="max-w-xs space-y-3">
            <Logo name={config.siteName} />
            <p className="text-sm leading-relaxed text-muted">
              Organizer kits for carry-ons, business trips and weekends away. {config.tagline}
            </p>
            <a href={`mailto:${config.supportEmail}`} className="text-sm underline underline-offset-4">{config.supportEmail}</a>
          </div>
          {FOOTER.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em]">{col.title}</h3>
              <ul className="space-y-2 text-sm text-muted">
                {col.links.map(([href, label]) => (
                  <li key={href}><Link href={href} className="hover:text-ink">{label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line py-5 text-center text-xs text-muted">
          © {new Date().getFullYear()} {config.siteName} · Secure checkout with PayPal
        </div>
      </footer>
    </>
  );
}
