import Link from "next/link";
import { logoutAdmin, requireAdmin } from "@/lib/admin-auth";
import { config, cjConfigured } from "@/lib/config";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const NAV = [
  ["/admin", "订单"],
  ["/admin/products", "商品"],
  ["/admin/cj", "CJ 选品"],
  ["/admin/emails", "发件箱"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  async function logout() {
    "use server";
    await logoutAdmin();
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-48 shrink-0 border-r border-stone-200 bg-white p-4">
        <Link href="/admin" className="mb-6 block font-semibold">{config.siteName} 后台</Link>
        <nav className="space-y-1 text-sm">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="block rounded px-2 py-1.5 hover:bg-stone-100">{label}</Link>
          ))}
          <Link href="/" target="_blank" className="block rounded px-2 py-1.5 text-stone-500 hover:bg-stone-100">查看店铺 ↗</Link>
        </nav>
        <div className="mt-8 space-y-1 text-xs text-stone-500">
          <div>支付：{config.paymentProvider === "paypal" ? `PayPal ${config.paypal.live ? "正式" : "沙箱"}` : "模拟"}</div>
          <div>CJ：{cjConfigured() ? (config.cj.autoOrder ? "已连接 · 自动下单" : "已连接 · 手动推送") : "未配置"}</div>
          <div>邮件：{config.mail.resendApiKey ? "Resend" : "仅记录"}</div>
        </div>
        <form action={logout} className="mt-6"><button className="text-xs text-stone-500 underline">退出</button></form>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
