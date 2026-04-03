import { useState } from 'react';
import { useGameStore, type PlayerTarget } from './store/game-store';
import { PlayerPanel } from './components/PlayerPanel';
import { PlayerToggle } from './components/PlayerToggle';
import { CardPicker } from './components/CardPicker';
import { cn } from './lib/cn';

function App() {
  const [activeTarget, setActiveTarget] = useState<PlayerTarget>('player');

  const playerCards = useGameStore((s) => s.playerCards);
  const opponentCards = useGameStore((s) => s.opponentCards);
  const firstPlayerIsUser = useGameStore((s) => s.firstPlayerIsUser);
  const status = useGameStore((s) => s.status);
  const resetAll = useGameStore((s) => s.resetAll);
  const setFirstPlayer = useGameStore((s) => s.setFirstPlayer);
  const startSolving = useGameStore((s) => s.startSolving);
  const cancelSolving = useGameStore((s) => s.cancelSolving);

  const isSolving = status === 'solving';
  const canSolve =
    playerCards.length > 0 &&
    opponentCards.length > 0 &&
    status === 'idle';

  return (
    <div className="min-h-screen bg-page-bg">
      <div className="max-w-[800px] mx-auto p-8">
        {/* App title */}
        <h1 className="text-3xl font-semibold text-center mb-8 text-gray-800">
          斗地主残局求解器
        </h1>

        {/* Player panels */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <PlayerPanel target="player" label="我方手牌" />
          <PlayerPanel target="opponent" label="对方手牌" />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between mb-4">
          {/* Player toggle */}
          <PlayerToggle activeTarget={activeTarget} onToggle={setActiveTarget} />

          {/* First player toggle */}
          <div className="flex gap-1">
            <button
              type="button"
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                firstPlayerIsUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50',
              )}
              onClick={() => setFirstPlayer(true)}
              disabled={isSolving}
            >
              先手
            </button>
            <button
              type="button"
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                !firstPlayerIsUser
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50',
              )}
              onClick={() => setFirstPlayer(false)}
              disabled={isSolving}
            >
              后手
            </button>
          </div>

          {/* Reset button */}
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            onClick={resetAll}
          >
            重置
          </button>
        </div>

        {/* Card picker */}
        <div className="mb-6">
          <CardPicker activeTarget={activeTarget} />
        </div>

        {/* Solve button */}
        <div className="flex gap-3">
          <button
            type="button"
            className={cn(
              'w-full py-3 rounded-lg font-semibold text-white transition-colors',
              canSolve
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed',
            )}
            disabled={!canSolve}
            onClick={startSolving}
          >
            开始求解
          </button>

          {/* Cancel button (shown during solving) */}
          {isSolving && (
            <button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
              onClick={cancelSolving}
            >
              取消求解
            </button>
          )}
        </div>

        {/* Solving progress indicator */}
        {isSolving && (
          <div className="mt-4 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            求解中...
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
