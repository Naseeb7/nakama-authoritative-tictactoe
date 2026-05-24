export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`paper-card relative rounded-[2rem] border border-[color:var(--stroke)] bg-[linear-gradient(180deg,rgba(255,249,238,0.98),rgba(244,232,211,0.96))] p-6 text-[color:var(--foreground)] shadow-[0_0_0_1px_rgba(255,255,255,0.72),0_22px_60px_rgba(78,54,35,0.16)] sm:p-7 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.35),transparent_36%,rgba(185,90,66,0.04)_78%,transparent)] opacity-60"
      />
      {children}
    </section>
  );
}
