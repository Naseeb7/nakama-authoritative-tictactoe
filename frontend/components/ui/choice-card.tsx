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
      ? "border-[rgba(185,90,66,0.3)] bg-[linear-gradient(180deg,rgba(253,236,228,0.98),rgba(243,213,202,0.98))] text-[color:var(--foreground)] shadow-[0_16px_30px_rgba(116,72,55,0.14)] -rotate-1"
      : "border-[rgba(95,71,48,0.22)] bg-[linear-gradient(180deg,rgba(250,244,232,0.98),rgba(239,226,205,0.98))] text-[color:var(--foreground)] shadow-[0_16px_30px_rgba(116,72,55,0.12)] rotate-1";
  const idleClassName =
    "border-[rgba(95,71,48,0.18)] bg-[linear-gradient(180deg,rgba(255,251,244,0.94),rgba(242,232,215,0.96))] text-[color:var(--foreground)] hover:-translate-y-1 hover:rotate-0 hover:border-[rgba(185,90,66,0.24)] hover:shadow-[0_18px_32px_rgba(116,72,55,0.12)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`paper-card rounded-[1.45rem] border p-4 text-left transition duration-200 ease-out ${
        isActive ? accentClassName : idleClassName
      }`}
    >
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
    </button>
  );
}
