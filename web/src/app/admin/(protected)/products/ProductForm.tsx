"use client";

import { useActionState, useState } from "react";
import { saveProduct, type ProductFormState } from "../actions";

export type ProductFormValue = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  images: string[];
  active: boolean;
  supplier: string;
  variants: { id?: string; name: string; sku: string; price: string; cost: string; supplierRef?: string | null }[];
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ProductForm({ initial }: { initial: ProductFormValue }) {
  const [v, setV] = useState(initial);
  const [imagesText, setImagesText] = useState(initial.images.join("\n"));
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, {});

  const payload = JSON.stringify({
    id: v.id,
    title: v.title,
    slug: v.slug,
    description: v.description,
    active: v.active,
    images: imagesText.split("\n").map((s) => s.trim()).filter(Boolean),
    variants: v.variants.map((x) => ({
      id: x.id,
      name: x.name,
      sku: x.sku,
      price: Number(x.price),
      cost: x.cost === "" ? undefined : Number(x.cost),
    })),
  });

  const setVariant = (i: number, patch: Partial<ProductFormValue["variants"][number]>) =>
    setV({ ...v, variants: v.variants.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  return (
    <form action={action} className="max-w-3xl space-y-5">
      <input type="hidden" name="payload" value={payload} />
      <div>
        <label className="label">标题</label>
        <input
          className="input"
          required
          value={v.title}
          onChange={(e) => setV({ ...v, title: e.target.value, slug: v.id ? v.slug : slugify(e.target.value) })}
        />
      </div>
      <div>
        <label className="label">URL slug</label>
        <input className="input" required value={v.slug} onChange={(e) => setV({ ...v, slug: e.target.value })} />
      </div>
      <div>
        <label className="label">描述</label>
        <textarea className="input h-32" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </div>
      <div>
        <label className="label">图片 URL（每行一个，第一张为主图）</label>
        <textarea className="input h-24 font-mono text-xs" value={imagesText} onChange={(e) => setImagesText(e.target.value)} />
      </div>

      <div>
        <label className="label">规格（售价 / 成本单位 USD）</label>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-stone-500">
            <tr><th>名称</th><th>SKU</th><th>售价</th><th>成本</th>{v.supplier === "CJ" && <th>CJ vid</th>}<th /></tr>
          </thead>
          <tbody>
            {v.variants.map((x, i) => (
              <tr key={x.id ?? i}>
                <td className="pr-2 py-1"><input className="input" required value={x.name} onChange={(e) => setVariant(i, { name: e.target.value })} /></td>
                <td className="pr-2"><input className="input" value={x.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} /></td>
                <td className="pr-2"><input className="input w-24" required type="number" step="0.01" value={x.price} onChange={(e) => setVariant(i, { price: e.target.value })} /></td>
                <td className="pr-2"><input className="input w-24" type="number" step="0.01" value={x.cost} onChange={(e) => setVariant(i, { cost: e.target.value })} /></td>
                {v.supplier === "CJ" && <td className="pr-2 text-xs text-stone-400">{x.supplierRef?.slice(0, 10)}…</td>}
                <td>
                  {v.variants.length > 1 && v.supplier !== "CJ" && (
                    <button type="button" className="text-xs text-red-600" onClick={() => setV({ ...v, variants: v.variants.filter((_, j) => j !== i) })}>删除</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {v.supplier !== "CJ" && (
          <button
            type="button"
            className="mt-2 text-sm underline"
            onClick={() => setV({ ...v, variants: [...v.variants, { name: "", sku: "", price: "", cost: "" }] })}
          >
            + 添加规格
          </button>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} />
        上架（前台可见、可购买）
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "保存中…" : "保存"}</button>
    </form>
  );
}
