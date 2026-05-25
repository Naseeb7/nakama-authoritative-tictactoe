"use client";

import { paperTheme, type PaperButtonVariant, type PaperTone } from "@/components/ui/paper-theme";
import Link from "next/link";

type ClassValue = string | undefined | null | false;

function cx(...parts: ClassValue[]) {
  return parts.filter(Boolean).join(" ");
}

type BaseProps = {
  className?: string;
  children: React.ReactNode;
};

export function PaperCard({
  children,
  className,
  variant = "default",
}: BaseProps & { variant?: "default" | "note" | "plain" }) {
  const variantClass =
    variant === "note"
      ? "paper-panel"
      : variant === "plain"
        ? "bg-transparent border-transparent"
        : "paper-panel-strong";

  return (
    <section
      className={cx(
        "paper-card relative rounded-[1.25rem] paper-texture",
        variantClass,
        className
      )}
    >
      {children}
    </section>
  );
}

export function PaperPressable({
  children,
  className,
  variant = "default",
  ...props
}: BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "note" | "plain";
  }) {
  const variantClass =
    variant === "note"
      ? "paper-panel"
      : variant === "plain"
        ? "bg-transparent border-transparent"
        : "paper-panel-strong";

  return (
    <button
      {...props}
      className={cx(
        "paper-card paper-texture rounded-[1.1rem] border px-4 py-4 text-left transition duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed",
        variantClass,
        className
      )}
    >
      {children}
    </button>
  );
}

export function PaperPanel({
  children,
  className,
}: BaseProps) {
  return (
    <div
      className={cx(
        "paper-card paper-texture rounded-[1rem] paper-panel",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DoodleHeading({
  children,
  className,
  as: Tag = "h2",
}: BaseProps & { as?: "h1" | "h2" | "h3" | "h4" }) {
  return (
    <Tag className={cx(paperTheme.typography.heading, className)}>
      {children}
    </Tag>
  );
}

export function SketchDivider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "h-px w-full bg-[linear-gradient(90deg,transparent,rgba(95,71,48,0.2)_18%,rgba(95,71,48,0.2)_82%,transparent)]",
        className
      )}
    />
  );
}

export function PaperBadge({
  children,
  className,
  tone = "neutral",
}: BaseProps & { tone?: PaperTone }) {
  const toneClass =
    tone === "accent"
      ? "paper-badge-accent"
      : tone === "accent-deep"
        ? "paper-badge-deep"
        : "paper-badge";

  return (
    <span
      className={cx(
        "paper-card paper-texture inline-flex rounded-full px-3 py-2 text-xs uppercase tracking-[0.22em]",
        toneClass,
        className
      )}
    >
      {children}
    </span>
  );
}

export function PaperButton({
  children,
  className,
  variant = "secondary",
  size = "md",
  ...props
}: BaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: "sm" | "md" | "lg";
    variant?: PaperButtonVariant;
  }) {
  const variantClass =
    variant === "primary"
      ? "paper-button-primary"
      : variant === "ghost"
        ? "paper-button-ghost"
        : "paper-button";
  const sizeClass =
    size === "sm" ? "px-3 py-2 text-xs" : size === "lg" ? "px-6 py-3 text-sm" : "px-4 py-2 text-sm";

  return (
    <button
      {...props}
      className={cx(
        "paper-card inline-flex items-center justify-center rounded-full font-medium disabled:cursor-not-allowed",
        variantClass,
        sizeClass,
        className
      )}
    >
      {children}
    </button>
  );
}

export function PaperLinkButton({
  children,
  className,
  variant = "secondary",
  ...props
}: BaseProps &
  React.ComponentProps<typeof Link> & {
    variant?: "primary" | "secondary" | "ghost";
  }) {
  const variantClass =
    variant === "primary"
      ? "paper-button-primary"
      : variant === "ghost"
        ? "paper-button-ghost"
        : "paper-button";

  return (
    <Link
      {...props}
      className={cx(
        "paper-card inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium active:scale-[0.99]",
        variantClass,
        className
      )}
    >
      {children}
    </Link>
  );
}

export function PaperInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cx(
        "paper-card paper-input min-w-0 rounded-full px-4 py-2 text-sm outline-none placeholder:text-[color:var(--ink-soft)] focus:ring-2 focus:ring-[rgba(185,90,66,0.1)]",
        className
      )}
    />
  );
}

export function StickyNote({
  children,
  className,
}: BaseProps) {
  return (
    <div
      className={cx(
        "paper-card paper-texture rounded-[1rem] paper-panel px-4 py-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PaperCell({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & BaseProps) {
  return (
    <button
      {...props}
      className={cx(
        "paper-card paper-texture paper-panel flex aspect-square items-center justify-center rounded-[0.9rem] text-[1.9rem] font-semibold tracking-tight transition duration-150 ease-out active:scale-[0.99] disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

export const paperMotion = {
  hover: "hover:bg-[rgba(249,240,227,0.98)] hover:border-[rgba(185,90,66,0.22)]",
  float: "hover:-translate-y-px",
  press: "active:scale-[0.99]",
  wobble: "paper-wobble",
  stamp: "paper-stamp",
  rotateLeft: "paper-rotate-right",
  rotateRight: "paper-rotate-left",
};
