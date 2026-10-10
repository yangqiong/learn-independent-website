import Link from "next/link";

// 文字 logo：小写 + 陶土橙圆点，确定品牌后可换成 SVG
export function Logo({ name }: { name: string }) {
  return (
    <Link href="/" className="group inline-flex items-baseline text-lg font-semibold lowercase tracking-tight">
      {name}
      <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-accent transition group-hover:scale-125" />
    </Link>
  );
}
