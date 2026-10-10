// 政策页面模板 —— 上线前务必按你的实际情况修改（尤其是退货条款、公司信息、联系方式）
import { config } from "./config";

export type Policy = { title: string; updated: string; sections: { heading?: string; body: string }[] };

export function getPolicy(slug: string): Policy | null {
  const c = config;
  const updated = "October 2026";
  const policies: Record<string, Policy> = {
    shipping: {
      title: "Shipping policy",
      updated,
      sections: [
        { body: `We currently ship to addresses in the United States. Shipping is free on every order.` },
        { heading: "Processing time", body: `Orders are processed within ${c.processingTime} (Monday–Friday, excluding holidays). You'll receive an email with a tracking number as soon as your order ships.` },
        { heading: "Delivery time", body: `Most orders arrive within ${c.deliveryEstimate} after shipping. Our products ship from our fulfillment partners' warehouses, so delivery takes a little longer than domestic shipping — we'd rather tell you upfront.` },
        { heading: "Multiple packages", body: "Kits and multi-item orders may ship in more than one package from different warehouses. Each package has its own tracking number, and we'll email you each one." },
        { heading: "Tracking", body: "Use the link in your shipping email, or open your order page from the confirmation email, to see the latest tracking updates. Tracking can take 2–3 business days to show the first scan." },
        { heading: "Lost or delayed packages", body: `If your order hasn't arrived within 25 business days of shipping, contact us at ${c.supportEmail} and we'll send a replacement or issue a full refund.` },
        { heading: "Wrong address", body: "Please double-check your shipping address at checkout. If you notice a mistake, email us within 12 hours of ordering and we'll do our best to correct it before it ships." },
      ],
    },
    returns: {
      title: "Returns & refunds",
      updated,
      sections: [
        { heading: "30-day guarantee", body: `If your item arrives damaged, defective, or not as described, email ${c.supportEmail} within 30 days of delivery with your order number and a photo. We'll send a free replacement or issue a full refund — no need to send the item back.` },
        { heading: "Changed your mind?", body: "Unused items in their original condition can be returned within 30 days of delivery. Email us first and we'll send you the return address. Return shipping is paid by the customer, and we'll refund the item price once the return arrives." },
        { heading: "Cancellations", body: "You can cancel your order for a full refund any time before it ships. Once an order has shipped, the return policy above applies." },
        { heading: "How refunds work", body: "Refunds go back to your original payment method through PayPal. Depending on your bank, it can take 5–10 business days to appear on your statement." },
      ],
    },
    privacy: {
      title: "Privacy policy",
      updated,
      sections: [
        { body: `${c.siteName} ("we", "us") respects your privacy. This policy explains what we collect when you shop with us and how we use it.` },
        { heading: "What we collect", body: "Your name, email address, shipping address and phone number (if provided) when you place an order, plus basic order details. Payments are processed by PayPal — we never see or store your card number." },
        { heading: "How we use it", body: "To process and ship your order, send order and shipping updates, provide customer support, and prevent fraud. We share your shipping details only with the fulfillment and shipping partners needed to deliver your order." },
        { heading: "Cookies", body: "We use essential cookies and your browser's local storage to keep your cart working. If we add analytics or advertising tools in the future, we'll update this policy." },
        { heading: "Your rights", body: `You can ask us to access, correct or delete your personal information at any time by emailing ${c.supportEmail}.` },
        { heading: "Contact", body: `Questions about this policy? Email ${c.supportEmail}.` },
      ],
    },
    terms: {
      title: "Terms of service",
      updated,
      sections: [
        { body: `By using this website and placing an order with ${c.siteName}, you agree to these terms.` },
        { heading: "Orders and pricing", body: "All prices are in US dollars. We reserve the right to refuse or cancel an order, for example if a product is out of stock or a price was listed in error; if we cancel a paid order, you'll receive a full refund." },
        { heading: "Product information", body: "We do our best to describe and photograph products accurately. Colors may vary slightly depending on your screen." },
        { heading: "Shipping, returns and refunds", body: "Covered by our Shipping policy and Returns & refunds policy, which are part of these terms." },
        { heading: "Limitation of liability", body: "To the extent permitted by law, our liability for any claim related to a product is limited to the amount you paid for that product." },
        { heading: "Contact", body: `Email ${c.supportEmail} with any questions.` },
      ],
    },
    contact: {
      title: "Contact us",
      updated,
      sections: [
        { body: `The fastest way to reach us is email: ${c.supportEmail}. We reply within 1 business day (Monday–Friday).` },
        { heading: "About an order?", body: "Include your order number (it's in your confirmation email) so we can help right away." },
      ],
    },
    about: {
      title: `About ${c.siteName}`,
      updated,
      sections: [
        { body: `${c.siteName} started with a simple frustration: digging through a suitcase for a charger that was definitely packed. We put together organizer kits that work as a set, so every trip starts with everything in its place.` },
        { body: "We're a small online shop. We test the products we sell, ship them free to the US, and stand behind them with a 30-day guarantee." },
      ],
    },
  };
  return policies[slug] ?? null;
}
