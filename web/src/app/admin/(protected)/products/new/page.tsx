import { feeRule } from "@/lib/config";
import { ProductForm } from "../ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">新建商品（手动发货）</h1>
      <p className="mb-6 text-sm text-stone-500">全站包邮：请把你自己发货的运费填进「运费成本」，并计入售价。</p>
      <ProductForm
        fee={feeRule()}
        initial={{
          title: "",
          slug: "",
          description: "",
          images: [],
          tags: [],
          highlights: [],
          active: true,
          supplier: "MANUAL",
          variants: [{ name: "Default", sku: "", price: "", cost: "", shipping: "" }],
        }}
      />
    </div>
  );
}
