const LABELS: Record<string, [string, string]> = {
  PENDING: ["待处理", "bg-stone-100 text-stone-600"],
  PAID: ["已支付", "bg-blue-100 text-blue-700"],
  FULFILLING: ["履约中", "bg-amber-100 text-amber-700"],
  PLACED: ["已向供应商下单", "bg-amber-100 text-amber-700"],
  SHIPPED: ["已发货", "bg-green-100 text-green-700"],
  FAILED: ["失败", "bg-red-100 text-red-700"],
  REFUNDED: ["已退款", "bg-purple-100 text-purple-700"],
  CANCELLED: ["已取消", "bg-stone-100 text-stone-500"],
};

export function StatusBadge({ status, prefix }: { status: string; prefix?: string }) {
  const [label, cls] = LABELS[status] ?? [status, "bg-stone-100"];
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs ${cls}`}>
      {prefix && `${prefix} · `}{label}
    </span>
  );
}
