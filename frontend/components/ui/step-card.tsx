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
    <div className="rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-300">
        {step}
      </p>
      <p className="mt-2 text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
    </div>
  );
}
