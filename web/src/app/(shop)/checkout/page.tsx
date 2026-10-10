import { config } from "@/lib/config";
import { CheckoutForm } from "./CheckoutForm";

export const dynamic = "force-dynamic";

export default function CheckoutPage() {
  return (
    <CheckoutForm
      provider={config.paymentProvider}
      countries={config.shipCountries}
      paypalClientId={config.paypal.clientId}
      currency={config.currency}
      shippingFlatCents={config.shippingFlatCents}
      freeShippingOverCents={config.freeShippingOverCents}
    />
  );
}
