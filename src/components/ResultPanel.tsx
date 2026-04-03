import { useGameStore } from '../store/game-store';
import { VALUE_DISPLAY } from '../lib/card-utils';

/**
 * Result display panel showing win/lose outcome, best move, and search statistics.
 * Only renders when status is 'done' or 'error'.
 */
export function ResultPanel() {
  const status = useGameStore((s) => s.status);
  const result = useGameStore((s) => s.result);
  const errorMessage = useGameStore((s) => s.errorMessage);

  if (status !== 'done' && status !== 'error') {
    return null;
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <p className="text-red-600 font-semibold">
          {errorMessage || '求解失败'}
        </p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  // Format time display
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Format best move cards as Chinese display names
  const formatMoveCards = (cards: number[]): string => {
    return cards.map((v) => VALUE_DISPLAY[v] ?? String(v)).join(' ');
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      {/* Win/Lose outcome */}
      {result.winnable ? (
        <div className="mb-4">
          <span className="text-3xl font-semibold text-white bg-green-600 px-6 py-2 rounded-lg inline-block">
            必胜
          </span>
        </div>
      ) : (
        <div className="mb-4">
          <span className="text-xl font-semibold text-red-600">
            无必胜策略
          </span>
        </div>
      )}

      {/* Best move (only for winning positions) */}
      {result.winnable && result.bestMove && result.bestMove.cards.length > 0 && (
        <div className="mb-4">
          <span className="text-sm font-semibold text-gray-500">最佳出牌</span>
          <p className="text-lg text-gray-800 mt-1">
            {formatMoveCards(result.bestMove.cards)}
          </p>
        </div>
      )}

      {/* Statistics table */}
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-gray-500">搜索节点数</span>
        <span className="text-sm text-gray-700">
          {result.stats.nodesExplored.toLocaleString()}
        </span>

        <span className="text-sm font-semibold text-gray-500">用时</span>
        <span className="text-sm text-gray-700">
          {formatTime(result.stats.timeMs)}
        </span>

        <span className="text-sm font-semibold text-gray-500">置换表命中</span>
        <span className="text-sm text-gray-700">
          {result.stats.transpositionHits.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
