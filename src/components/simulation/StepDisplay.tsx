import type { SimulationStep } from '../../lib/simulation-path';
import type { GameStateAtNode } from '../../lib/tree-state';
import { cn } from '../../lib/cn';
import { VALUE_DISPLAY } from '../../lib/card-utils';
import { handSize } from '../../solver/encoding';

interface StepDisplayProps {
  step: SimulationStep;
  gameState: GameStateAtNode;
}

/** Convert a count-encoded hand to displayable card value array */
function handToValues(hand: number[]): number[] {
  const values: number[] = [];
  for (let i = 0; i < hand.length; i++) {
    for (let j = 0; j < hand[i]; j++) {
      values.push(i + 1);
    }
  }
  return values;
}

export function StepDisplay({ step, gameState }: StepDisplayProps) {
  const playerCards = handToValues(gameState.playerHand);
  const opponentCards = handToValues(gameState.opponentHand);

  return (
    <div className="space-y-4">
      {/* Current player indicator */}
      <div className="flex items-center gap-2">
        <span className={cn(
          'px-3 py-1 rounded-full text-sm font-semibold',
          step.isPlayerMove
            ? 'bg-blue-100 text-step-player'
            : 'bg-purple-100 text-step-opponent',
        )}>
          {step.isPlayerMove ? '我方' : '对方'}
        </span>
        <span className="text-sm text-gray-500">
          出牌
        </span>
      </div>

      {/* Cards played */}
      <div className="flex items-center gap-2 flex-wrap min-h-[56px]">
        {step.move.cards.length > 0 ? (
          step.move.cards.map((card, i) => (
            <span key={i} className="text-base font-medium text-gray-800 bg-white border border-gray-200 rounded px-2 py-1">
              {VALUE_DISPLAY[card] ?? String(card)}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-400 italic">过</span>
        )}
      </div>

      {/* Remaining hands */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <span className="text-xs font-semibold text-gray-500 block mb-1">我方剩余 ({handSize(gameState.playerHand)})</span>
          <div className="flex flex-wrap gap-1">
            {playerCards.map((v, i) => (
              <span key={i} className="text-sm text-gray-700 bg-gray-50 rounded px-1.5 py-0.5">
                {VALUE_DISPLAY[v]}
              </span>
            ))}
            {playerCards.length === 0 && <span className="text-xs text-gray-400 italic">无</span>}
          </div>
        </div>
        <div>
          <span className="text-xs font-semibold text-gray-500 block mb-1">对方剩余 ({handSize(gameState.opponentHand)})</span>
          <div className="flex flex-wrap gap-1">
            {opponentCards.map((v, i) => (
              <span key={i} className="text-sm text-gray-700 bg-gray-50 rounded px-1.5 py-0.5">
                {VALUE_DISPLAY[v]}
              </span>
            ))}
            {opponentCards.length === 0 && <span className="text-xs text-gray-400 italic">无</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
