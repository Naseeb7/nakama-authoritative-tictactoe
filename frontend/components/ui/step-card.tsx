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
    <div className="paper-card rounded-[1.35rem] border border-[rgba(95,71,48,0.16)] bg-[linear-gradient(180deg,rgba(255,250,242,0.98),rgba(244,232,213,0.96))] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--accent-deep)]">
        {step}
      </p>
      <p className="mt-2 text-base font-semibold text-[color:var(--foreground)]">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">{body}</p>
    </div>
  );
}
