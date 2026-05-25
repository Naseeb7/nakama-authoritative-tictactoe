"use client";

import { PaperCard, PaperCell } from "@/components/ui/paper-primitives";

type GameBoardProps = {
  board: string[];
  canPlay: boolean;
  onSelectCell: (position: number) => void;
  pendingPosition: number | null;
};

export function GameBoard({
  board,
  canPlay,
  onSelectCell,
  pendingPosition,
}: GameBoardProps) {
  return (
    <PaperCard className="relative mx-auto grid w-full max-w-[320px] grid-cols-3 gap-2 rounded-[1.15rem] p-2 shadow-none sm:max-w-[420px] sm:gap-2.5 sm:rounded-[1.25rem] sm:p-2.5 lg:max-w-[480px] lg:gap-3 lg:p-3">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-2 rounded-[inherit] bg-[linear-gradient(90deg,transparent_31.5%,rgba(95,71,48,0.12)_31.5%,rgba(95,71,48,0.12)_33%,transparent_33%,transparent_66%,rgba(95,71,48,0.12)_66%,rgba(95,71,48,0.12)_67.5%,transparent_67.5%),linear-gradient(180deg,transparent_31.5%,rgba(95,71,48,0.12)_31.5%,rgba(95,71,48,0.12)_33%,transparent_33%,transparent_66%,rgba(95,71,48,0.12)_66%,rgba(95,71,48,0.12)_67.5%,transparent_67.5%)] opacity-70"
      />
      {board.map((cell, index) => {
        const isPending = pendingPosition === index;
        const tiltClassName =
          index % 3 === 0
            ? "-rotate-[0.4deg]"
            : index % 3 === 1
              ? "rotate-[0.35deg]"
              : "-rotate-[0.2deg]";

        return (
          <PaperCell
            key={`${index}-${cell}`}
            type="button"
            disabled={!canPlay || cell !== "" || isPending}
            onClick={() => onSelectCell(index)}
            className={`relative z-10 aspect-square rounded-[0.9rem] text-[1.9rem] font-semibold tracking-tight sm:rounded-[1rem] sm:text-3xl lg:rounded-[1.1rem] lg:text-4xl ${tiltClassName} ${
              cell !== ""
                ? cell === "X"
                  ? "border-[rgba(95,71,48,0.2)] bg-[rgba(247,238,225,0.96)] text-[color:var(--accent-deep)]"
                  : "border-[rgba(185,90,66,0.2)] bg-[rgba(251,239,233,0.96)] text-[color:var(--accent)]"
                : canPlay
                  ? "border-[rgba(95,71,48,0.16)] bg-[rgba(255,251,246,0.98)] text-[color:var(--ink-soft)] hover:-translate-y-px hover:rotate-0 hover:border-[rgba(185,90,66,0.22)] hover:text-[color:var(--accent)]"
                  : "border-[rgba(95,71,48,0.12)] bg-[rgba(251,246,236,0.9)] text-[rgba(107,91,77,0.72)]"
            } ${isPending ? "animate-pulse" : ""}`}
          >
            <span className="translate-y-[1px] font-serif text-[0.92em] tracking-tight">
              {cell || ""}
            </span>
          </PaperCell>
        );
      })}
    </PaperCard>
  );
}
