export const paperTheme = {
  colors: {
    background: "var(--background)",
    foreground: "var(--foreground)",
    surface: "rgba(250, 243, 229, 0.96)",
    surfaceAlt: "rgba(255, 249, 239, 0.95)",
    surfaceMuted: "rgba(255, 250, 244, 0.88)",
    stroke: "rgba(95, 71, 48, 0.16)",
    strokeStrong: "rgba(95, 71, 48, 0.24)",
    accent: "var(--accent)",
    accentDeep: "var(--accent-deep)",
    accentSoft: "var(--accent-soft)",
    inkSoft: "var(--ink-soft)",
  },
  shadows: {
    flat: "shadow-none",
    soft: "shadow-[0_0_0_1px_rgba(255,255,255,0.45)_inset]",
  },
  textures: {
    surface:
      "bg-[rgba(250,243,229,0.96)]",
    surfaceAlt:
      "bg-[rgba(255,249,239,0.95)]",
    note:
      "bg-[rgba(255,250,244,0.88)]",
  },
  borders: {
    card: "border border-[color:var(--stroke)]",
    cardStrong: "border border-[color:var(--stroke-strong)]",
    thin: "border border-[rgba(95,71,48,0.12)]",
  },
  motion: {
    idle: "transition duration-150 ease-out",
    hover: "hover:border-[rgba(185,90,66,0.22)] hover:bg-[rgba(249,240,227,0.98)]",
    press: "active:scale-[0.99]",
    float: "hover:-translate-y-px",
    slightRotate: "rotate-[0.6deg]",
    slightRotateAlt: "-rotate-[0.6deg]",
    wobble: "animate-[paper-wobble_0.28s_ease-out]",
    stamp: "animate-[paper-stamp_0.16s_ease-out]",
  },
  typography: {
    heading: "paper-heading",
    label: "text-[10px] uppercase tracking-[0.28em]",
    body: "text-[color:var(--foreground)]",
    muted: "text-[color:var(--ink-soft)]",
  },
  spacing: {
    card: "p-6 sm:p-7",
    note: "px-4 py-4",
    button: "px-4 py-2",
    buttonLg: "px-5 py-3",
    input: "px-4 py-2",
  },
} as const;

export type PaperTone = "neutral" | "accent" | "accent-deep";
export type PaperButtonVariant = "primary" | "secondary" | "ghost";
export type PaperCardVariant = "default" | "note" | "plain";
