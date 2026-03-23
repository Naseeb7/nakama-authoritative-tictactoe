export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[2rem] border border-[color:var(--stroke)] bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(57,37,18,0.08)] backdrop-blur-xl sm:p-7 ${className}`}
    >
      {children}
    </section>
  );
}
