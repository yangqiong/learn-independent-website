import { ProductForm } from "../ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">新建商品（手动发货）</h1>
      <ProductForm
        initial={{
          title: "",
          slug: "",
          description: "",
          images: [],
          active: true,
          supplier: "MANUAL",
          variants: [{ name: "Default", sku: "", price: "", cost: "" }],
        }}
      />
    </div>
  );
}
