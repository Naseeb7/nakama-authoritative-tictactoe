import { PaperCard } from "@/components/ui/paper-primitives";

export function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <PaperCard
      variant="default"
      className={`relative rounded-[1.8rem] p-6 text-[color:var(--foreground)] sm:p-7 ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_42%,rgba(185,90,66,0.02)_78%,transparent)] opacity-25"
      />
      {children}
    </PaperCard>
  );
}
