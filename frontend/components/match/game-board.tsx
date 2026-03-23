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
    <div className="grid grid-cols-3 gap-3">
      {board.map((cell, index) => {
        const isPending = pendingPosition === index;

        return (
          <button
            key={`${index}-${cell}`}
            type="button"
            disabled={!canPlay || cell !== "" || isPending}
            onClick={() => onSelectCell(index)}
            className={`flex aspect-square items-center justify-center rounded-[1.4rem] border text-4xl font-semibold transition sm:text-5xl ${
              cell !== ""
                ? "border-slate-300 bg-slate-100 text-slate-950"
                : canPlay
                  ? "border-slate-300 bg-white text-slate-400 hover:border-slate-950 hover:bg-slate-50 hover:text-slate-950"
                  : "border-slate-200 bg-slate-50 text-slate-300"
            } ${isPending ? "animate-pulse" : ""}`}
          >
            {cell || ""}
          </button>
        );
      })}
    </div>
  );
}
