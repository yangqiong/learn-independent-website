import Link from "next/link";
import { kitContents, minPrice, productImages, type ProductWithVariants } from "@/lib/catalog";
import { formatMoney } from "@/lib/money";

export function ProductCard({ product }: { product: ProductWithVariants }) {
  const image = productImages(product)[0];
  const contents = kitContents(product);
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="aspect-square overflow-hidden rounded-2xl bg-white">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-medium">{product.title}</h3>
          {contents.length > 0 && <p className="mt-1 text-sm text-muted">{contents.length} pieces · {contents.join(" · ")}</p>}
        </div>
        <div className="shrink-0 font-medium">
          {product.variants.length > 1 && <span className="text-sm font-normal text-muted">from </span>}
          {formatMoney(minPrice(product))}
        </div>
      </div>
    </Link>
  );
}
