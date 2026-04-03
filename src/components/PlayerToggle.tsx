import type { PlayerTarget } from '../store/game-store';
import { cn } from '../lib/cn';

interface PlayerToggleProps {
  activeTarget: PlayerTarget;
  onToggle: (target: PlayerTarget) => void;
}

export function PlayerToggle({ activeTarget, onToggle }: PlayerToggleProps) {
  return (
    <div className="flex gap-1">
      <button
        type="button"
        className={cn(
          'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
          activeTarget === 'player'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50',
        )}
        onClick={() => onToggle('player')}
        aria-label="选择我方"
      >
        我方
      </button>
      <button
        type="button"
        className={cn(
          'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
          activeTarget === 'opponent'
            ? 'bg-blue-600 text-white'
            : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50',
        )}
        onClick={() => onToggle('opponent')}
        aria-label="选择对方"
      >
        对方
      </button>
    </div>
  );
}
