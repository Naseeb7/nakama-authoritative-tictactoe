"use client";

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
      ? "border-fuchsia-400/45 bg-fuchsia-500/12 text-white shadow-[0_0_28px_rgba(255,79,216,0.14)]"
      : "border-cyan-400/45 bg-cyan-400/12 text-white shadow-[0_0_28px_rgba(0,183,255,0.14)]";
  const idleClassName =
    "border-slate-800 bg-slate-950/70 text-slate-100 hover:-translate-y-0.5 hover:border-cyan-400/30 hover:bg-slate-950";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.5rem] border p-4 text-left transition ${
        isActive ? accentClassName : idleClassName
      }`}
    >
      <h3 className="text-lg font-semibold tracking-tight text-inherit">{title}</h3>
      <p
        className={`mt-2 text-sm leading-6 ${
          isActive ? "text-slate-200" : "text-[color:var(--ink-soft)]"
        }`}
      >
        {description}
      </p>
    </button>
  );
}
