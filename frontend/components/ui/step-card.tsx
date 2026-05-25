import { StickyNote } from "@/components/ui/paper-primitives";

export function StepCard({
  body,
  step,
  title,
}: {
  body: string;
  step: string;
  title: string;
}) {
  return (
    <StickyNote className="rounded-[1.1rem]">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
        {step}
      </p>
      <p className="mt-2 text-base font-semibold text-[color:var(--foreground)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{body}</p>
    </StickyNote>
  );
}
