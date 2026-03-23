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
    <div className="grid grid-cols-3 gap-3 rounded-[2rem] border border-cyan-400/20 bg-[linear-gradient(180deg,_rgba(7,11,25,0.98),_rgba(11,17,37,0.95))] p-3 shadow-[0_0_0_1px_rgba(77,226,255,0.05),0_0_36px_rgba(0,183,255,0.12)]">
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
                  ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_20px_rgba(0,183,255,0.16)]"
                  : "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-200 shadow-[0_0_20px_rgba(255,79,216,0.14)]"
                : canPlay
                  ? "border-slate-700 bg-slate-950/80 text-slate-500 hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-slate-900 hover:text-cyan-200 hover:shadow-[0_0_18px_rgba(0,183,255,0.14)]"
                  : "border-slate-800 bg-slate-950/70 text-slate-700"
            } ${isPending ? "animate-pulse" : ""}`}
          >
            {cell || ""}
          </button>
        );
      })}
    </div>
  );
}
