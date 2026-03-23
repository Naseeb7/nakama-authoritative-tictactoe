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
    <div className="grid grid-cols-3 gap-3 rounded-[2rem] border border-[color:var(--stroke)] bg-[linear-gradient(180deg,_rgba(255,248,240,0.92),_rgba(247,236,222,0.78))] p-3 shadow-[0_24px_60px_rgba(60,38,19,0.08)]">
      {board.map((cell, index) => {
        const isPending = pendingPosition === index;

        return (
          <button
            key={`${index}-${cell}`}
            type="button"
            disabled={!canPlay || cell !== "" || isPending}
            onClick={() => onSelectCell(index)}
            className={`flex aspect-square items-center justify-center rounded-[1.4rem] border text-4xl font-semibold tracking-tight transition sm:text-5xl ${
              cell !== ""
                ? cell === "X"
                  ? "border-orange-200 bg-orange-50 text-[color:var(--accent-deep)]"
                  : "border-stone-300 bg-stone-100 text-stone-900"
                : canPlay
                  ? "border-[color:var(--stroke-strong)] bg-white text-stone-400 hover:-translate-y-0.5 hover:border-[color:var(--accent-deep)] hover:bg-[#fff8f1] hover:text-stone-950"
                  : "border-[color:var(--stroke)] bg-[#f4ede4] text-stone-300"
            } ${isPending ? "animate-pulse" : ""}`}
          >
            {cell || ""}
          </button>
        );
      })}
    </div>
  );
}
