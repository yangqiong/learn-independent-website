import * as cj from "@/lib/cj";
import { config, cjConfigured } from "@/lib/config";
import { importCJProduct } from "../actions";

export default async function CJPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page = "1" } = await searchParams;

  if (!cjConfigured()) {
    return (
      <div className="max-w-xl space-y-3 text-sm">
        <h1 className="text-xl font-semibold">CJ 选品</h1>
        <p>还没有配置 CJ。步骤：</p>
        <ol className="list-decimal space-y-1 pl-5 text-stone-700">
          <li>注册 <a className="underline" href="https://cjdropshipping.com" target="_blank">cjdropshipping.com</a>（免费）</li>
          <li>进入「My CJ → Authorization → API」生成 API Key</li>
          <li>写入 <code>web/.env</code> 的 <code>CJ_API_KEY</code>，重启 <code>pnpm dev</code></li>
        </ol>
      </div>
    );
  }

  let result: Awaited<ReturnType<typeof cj.searchProducts>> | null = null;
  let error = "";
  if (q) {
    try {
      result = await cj.searchProducts(q, Number(page));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">CJ 选品</h1>
      <form className="mb-6 flex gap-2">
        <input name="q" defaultValue={q} placeholder="英文关键词，如 phone case / yoga mat" className="input max-w-sm" />
        <button className="btn">搜索</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && <p className="mb-3 text-xs text-stone-500">共 {result.total} 个结果 · 导入时售价 = 成本 × 加价倍数</p>}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {result?.items.map((p) => (
          <div key={p.id} className="rounded-lg border border-stone-200 bg-white p-3 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.bigImage} alt="" className="aspect-square w-full rounded bg-stone-100 object-cover" />
            <div className="mt-2 line-clamp-2 h-10">{p.nameEn}</div>
            <div className="text-stone-600">成本 ${p.sellPrice}</div>
            <form action={importCJProduct} className="mt-2 flex gap-1">
              <input type="hidden" name="pid" value={p.id} />
              <input name="markup" type="number" step="0.1" defaultValue={config.cj.markup} className="input w-16" title="加价倍数" />
              <button className="btn flex-1">导入</button>
            </form>
          </div>
        ))}
      </div>
      {result && result.items.length > 0 && (
        <div className="mt-6 flex gap-2 text-sm">
          {Number(page) > 1 && <a className="underline" href={`?q=${encodeURIComponent(q)}&page=${Number(page) - 1}`}>上一页</a>}
          <a className="underline" href={`?q=${encodeURIComponent(q)}&page=${Number(page) + 1}`}>下一页</a>
        </div>
      )}
    </div>
  );
}
