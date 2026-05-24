"use client";

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
    <div className="paper-card mx-auto grid w-full max-w-[320px] grid-cols-3 gap-2 rounded-[1.5rem] border border-[rgba(95,71,48,0.2)] bg-[linear-gradient(180deg,rgba(249,241,227,0.98),rgba(240,225,203,0.96))] p-2 shadow-[0_0_0_1px_rgba(255,255,255,0.65),0_18px_48px_rgba(78,54,35,0.16)] sm:max-w-[420px] sm:gap-2.5 sm:rounded-[1.8rem] sm:p-2.5 lg:max-w-[480px] lg:gap-3 lg:p-3">
      {board.map((cell, index) => {
        const isPending = pendingPosition === index;
        const tiltClassName =
          index % 3 === 0
            ? "-rotate-1"
            : index % 3 === 1
              ? "rotate-[0.75deg]"
              : "-rotate-[0.4deg]";

        return (
          <button
            key={`${index}-${cell}`}
            type="button"
            disabled={!canPlay || cell !== "" || isPending}
            onClick={() => onSelectCell(index)}
            className={`paper-card flex aspect-square items-center justify-center rounded-[1rem] border text-[1.9rem] font-semibold tracking-tight transition duration-200 ease-out sm:rounded-[1.15rem] sm:text-3xl lg:rounded-[1.35rem] lg:text-4xl ${tiltClassName} ${
              cell !== ""
                ? cell === "X"
                  ? "border-[rgba(95,71,48,0.22)] bg-[linear-gradient(180deg,rgba(247,238,225,0.98),rgba(233,217,193,0.96))] text-[color:var(--accent-deep)] shadow-[0_12px_22px_rgba(92,67,46,0.12)]"
                  : "border-[rgba(185,90,66,0.22)] bg-[linear-gradient(180deg,rgba(251,239,233,0.98),rgba(240,214,203,0.96))] text-[color:var(--accent)] shadow-[0_12px_22px_rgba(116,72,55,0.14)]"
                : canPlay
                  ? "border-[rgba(95,71,48,0.18)] bg-[linear-gradient(180deg,rgba(255,251,246,0.98),rgba(243,232,217,0.96))] text-[color:var(--ink-soft)] hover:-translate-y-0.5 hover:rotate-0 hover:border-[rgba(185,90,66,0.28)] hover:text-[color:var(--accent)] hover:shadow-[0_12px_24px_rgba(116,72,55,0.14)]"
                  : "border-[rgba(95,71,48,0.12)] bg-[linear-gradient(180deg,rgba(251,246,236,0.9),rgba(241,229,211,0.94))] text-[rgba(107,91,77,0.7)]"
            } ${isPending ? "animate-pulse" : ""}`}
          >
            <span className="translate-y-[1px] font-serif">{cell || ""}</span>
          </button>
        );
      })}
    </div>
  );
}
