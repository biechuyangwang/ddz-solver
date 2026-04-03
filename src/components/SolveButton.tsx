import { useGameStore } from '../store/game-store';
import { ElapsedTime } from './ElapsedTime';

interface SolveButtonProps {
  canSolve: boolean;
}

/**
 * Solve trigger button with three visual states:
 * - idle + canSolve: Blue "开始求解" button
 * - idle + !canSolve: Gray disabled "开始求解" button
 * - solving: "求解中..." spinner + "取消求解" red button + elapsed time
 * - done/error: Same as idle+canSolve (allows re-solve)
 */
export function SolveButton({ canSolve }: SolveButtonProps) {
  const status = useGameStore((s) => s.status);
  const startSolving = useGameStore((s) => s.startSolving);
  const cancelSolving = useGameStore((s) => s.cancelSolving);

  const isSolving = status === 'solving';

  if (isSolving) {
    return (
      <div aria-live="polite">
        <div className="flex gap-2">
          <button
            disabled
            aria-busy={true}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-3 rounded-lg font-semibold text-xl cursor-not-allowed flex-1"
          >
            <span className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            求解中...
          </button>
          <button
            onClick={cancelSolving}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold"
          >
            取消求解
          </button>
        </div>
        <div className="mt-2">
          <ElapsedTime />
        </div>
      </div>
    );
  }

  return (
    <div aria-live="polite">
      <button
        onClick={startSolving}
        disabled={!canSolve}
        aria-busy={false}
        className={
          canSolve
            ? 'bg-blue-600 hover:bg-blue-700 text-white w-full py-3 rounded-lg font-semibold text-xl'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed w-full py-3 rounded-lg font-semibold text-xl'
        }
      >
        开始求解
      </button>
    </div>
  );
}
