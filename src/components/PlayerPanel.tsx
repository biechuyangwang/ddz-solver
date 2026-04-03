import { useGameStore, type PlayerTarget } from '../store/game-store';
import { cn } from '../lib/cn';
import { HandDisplay } from './HandDisplay';

interface PlayerPanelProps {
  target: PlayerTarget;
  label: string;
}

export function PlayerPanel({ target, label }: PlayerPanelProps) {
  const playerCards = useGameStore((s) => s.playerCards);
  const opponentCards = useGameStore((s) => s.opponentCards);
  const clearPlayerCards = useGameStore((s) => s.clearPlayerCards);
  const status = useGameStore((s) => s.status);

  const cards = target === 'player' ? playerCards : opponentCards;
  const isSolving = status === 'solving';

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-gray-500">
          {label} ({cards.length}张)
        </h2>
        <button
          type="button"
          className={cn(
            'text-xs px-2 py-1 rounded transition-colors',
            cards.length === 0 || isSolving
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100',
          )}
          disabled={cards.length === 0 || isSolving}
          onClick={() => clearPlayerCards(target)}
        >
          清空
        </button>
      </div>
      <HandDisplay cards={cards} target={target} label={label} />
    </div>
  );
}
