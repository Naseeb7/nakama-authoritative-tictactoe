"use client";

import { PaperPressable, paperMotion } from "@/components/ui/paper-primitives";

type ChoiceCardProps = {
  accent?: "cyan" | "fuchsia";
  description: string;
  isActive?: boolean;
  onClick?: () => void;
  title: string;
};

export function ChoiceCard({
  accent = "cyan",
  description,
  isActive = false,
  onClick,
  title,
}: ChoiceCardProps) {
  const accentClassName =
    accent === "fuchsia"
      ? "border-[rgba(91,62,43,0.24)] bg-[rgba(238,224,208,0.96)] text-[color:var(--foreground)]"
      : "border-[rgba(75,52,36,0.2)] bg-[rgba(249,243,229,0.96)] text-[color:var(--foreground)]";
  const idleClassName =
    "border-[rgba(75,52,36,0.16)] bg-[rgba(252,248,240,0.96)] text-[color:var(--foreground)] hover:border-[rgba(91,62,43,0.22)]";

  return (
    <PaperPressable
      onClick={onClick}
      aria-pressed={isActive}
      className={`relative overflow-hidden rounded-[1.1rem] p-4 text-left ${paperMotion.press} ${paperMotion.float} ${
        isActive ? accentClassName : idleClassName
      } ${isActive ? "ring-1 ring-[rgba(91,62,43,0.16)]" : ""}`}
    >
      {isActive ? (
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-[rgba(75,52,36,0.14)] bg-[rgba(255,250,244,0.82)] px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-[color:var(--accent-deep)] shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]">
          <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--accent-deep)] opacity-80" />
          Selected
        </div>
      ) : null}
      <h3 className="text-lg font-semibold tracking-tight text-inherit">
        {title}
      </h3>
      <p
        className={`mt-2 text-sm leading-6 ${
          isActive ? "text-[color:var(--foreground)]" : "text-[color:var(--ink-soft)]"
        }`}
      >
        {description}
      </p>
    </PaperPressable>
  );
}
