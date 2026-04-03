import type { SolverResult } from '../solver/types';
import { VALUE_DISPLAY } from '../lib/card-utils';

interface ResultHeaderProps {
  result: SolverResult;
}

export function ResultHeader({ result }: ResultHeaderProps) {
  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatMoveCards = (cards: number[]): string => {
    return cards.map((v) => VALUE_DISPLAY[v] ?? String(v)).join(' ');
  };

  return (
    <div className="mb-4">
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

      {result.winnable && result.bestMove && result.bestMove.cards.length > 0 && (
        <div className="mb-4">
          <span className="text-sm font-semibold text-gray-500">最佳出牌</span>
          <p className="text-lg text-gray-800 mt-1">
            {formatMoveCards(result.bestMove.cards)}
          </p>
        </div>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <span className="text-sm font-semibold text-gray-500">搜索节点数</span>
        <span className="text-sm text-gray-700">{result.stats.nodesExplored.toLocaleString()}</span>
        <span className="text-sm font-semibold text-gray-500">用时</span>
        <span className="text-sm text-gray-700">{formatTime(result.stats.timeMs)}</span>
        <span className="text-sm font-semibold text-gray-500">置换表命中</span>
        <span className="text-sm text-gray-700">{result.stats.transpositionHits.toLocaleString()}</span>
      </div>
    </div>
  );
}
