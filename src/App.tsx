import { useGameStore } from './store/game-store';
import { SolveButton } from './components/SolveButton';
import { ResultPanel } from './components/ResultPanel';

function App() {
  const playerCards = useGameStore((s) => s.playerCards);
  const opponentCards = useGameStore((s) => s.opponentCards);

  const canSolve = playerCards.length > 0 && opponentCards.length > 0;

  return (
    <div className="min-h-screen bg-page-bg flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-[800px]">
        {/* App title */}
        <h1 className="text-3xl font-semibold text-gray-800 text-center mb-6">
          斗地主残局求解器
        </h1>

        {/* Solve button section */}
        <div className="mb-4">
          <SolveButton canSolve={canSolve} />
        </div>

        {/* Result panel (conditionally visible) */}
        <div aria-live="polite" className="mt-4">
          <ResultPanel />
        </div>
      </div>
    </div>
  );
}
export default App;
