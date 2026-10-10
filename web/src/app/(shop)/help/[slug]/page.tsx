import { notFound } from "next/navigation";
import { getPolicy } from "@/lib/policies";

export const dynamic = "force-dynamic";

export default async function HelpPage({ params }: { params: Promise<{ slug: string }> }) {
  const policy = getPolicy((await params).slug);
  if (!policy) notFound();
  return (
    <article className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="h-section">{policy.title}</h1>
      <p className="mt-2 text-xs text-muted">Last updated {policy.updated}</p>
      <div className="mt-10 space-y-8">
        {policy.sections.map((s, i) => (
          <section key={i}>
            {s.heading && <h2 className="mb-2 font-semibold">{s.heading}</h2>}
            <p className="leading-relaxed text-muted">{s.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
