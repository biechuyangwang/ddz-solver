import { useState } from 'react';
import { useGameStore, type PlayerTarget } from './store/game-store';
import { PlayerPanel } from './components/PlayerPanel';
import { PlayerToggle } from './components/PlayerToggle';
import { CardPicker } from './components/CardPicker';
import { SolveButton } from './components/SolveButton';
import { ResultPanel } from './components/ResultPanel';
import { cn } from './lib/cn';

function App() {
  const [activeTarget, setActiveTarget] = useState<PlayerTarget>('player');

  const playerCards = useGameStore((s) => s.playerCards);
  const opponentCards = useGameStore((s) => s.opponentCards);
  const firstPlayerIsUser = useGameStore((s) => s.firstPlayerIsUser);
  const status = useGameStore((s) => s.status);
  const resetAll = useGameStore((s) => s.resetAll);
  const setFirstPlayer = useGameStore((s) => s.setFirstPlayer);

  const isSolving = status === 'solving';
  const canSolve =
    playerCards.length > 0 &&
    opponentCards.length > 0 &&
    (status === 'idle' || status === 'done' || status === 'error');

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
        <div className="mb-4">
          <SolveButton canSolve={canSolve} />
        </div>

        {/* Result panel */}
        <div aria-live="polite" className="mt-4">
          <ResultPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
