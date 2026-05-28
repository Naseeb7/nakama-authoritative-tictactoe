import { AuthStatusCard } from "@/components/layout/auth-status-card";
import { SectionCard } from "@/components/ui/section-card";

export default function AccountPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <SectionCard className="self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[color:var(--accent)]">
          Player Card
        </p>
        <h2 className="paper-heading mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
          Your name, your signal, your little game-room card.
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--ink-soft)] sm:text-base">
          Change your display name, switch to a different guest identity, or
          reconnect if the live session drifts away.
        </p>
      </SectionCard>

      <AuthStatusCard />
    </div>
  );
}
