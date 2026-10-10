import { isFreeShipping } from "@/lib/config";
import { CartView } from "./CartView";

export const dynamic = "force-dynamic";

export default function CartPage() {
  return <CartView freeShipping={isFreeShipping()} />;
}
