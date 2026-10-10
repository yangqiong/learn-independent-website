import { config } from "@/lib/config";
import { CheckoutForm } from "./CheckoutForm";

export default function CheckoutPage() {
  return (
    <CheckoutForm
      provider={config.paymentProvider}
      paypalClientId={config.paypal.clientId}
      currency={config.currency}
      shippingFlatCents={config.shippingFlatCents}
      freeShippingOverCents={config.freeShippingOverCents}
    />
  );
}
