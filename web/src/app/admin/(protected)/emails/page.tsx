import { db } from "@/lib/db";

export default async function EmailsPage() {
  const emails = await db.emailLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">发件箱</h1>
      <p className="mb-6 text-sm text-stone-500">系统发给买家的所有邮件。配置 RESEND_API_KEY 后会真实发送。</p>
      <div className="space-y-4">
        {emails.map((e) => (
          <details key={e.id} className="rounded-lg border border-stone-200 bg-white">
            <summary className="cursor-pointer p-4 text-sm">
              <span className="font-medium">{e.subject}</span>
              <span className="ml-2 text-stone-500">→ {e.to}</span>
              <span className="ml-2 text-xs text-stone-400">{e.createdAt.toLocaleString("zh-CN")} · {e.status}</span>
            </summary>
            {/* 邮件内容由系统模板生成 */}
            <div className="border-t border-stone-100 p-4" dangerouslySetInnerHTML={{ __html: e.html }} />
            {e.error && <p className="px-4 pb-4 text-xs text-red-600">{e.error}</p>}
          </details>
        ))}
      </div>
    </div>
  );
}
