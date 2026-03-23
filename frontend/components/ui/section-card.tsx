export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[2rem] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_0_0_1px_rgba(77,226,255,0.05),0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}
