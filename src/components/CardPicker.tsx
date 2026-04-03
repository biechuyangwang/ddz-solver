import type { PlayerTarget } from '../store/game-store';
import { useGameStore } from '../store/game-store';
import {
  SUITS,
  FACE_VALUES,
  JOKER_VALUES,
  SUIT_SYMBOLS,
  maxCountForValue,
  type Suit,
} from '../lib/card-utils';
import { CardFace } from './CardFace';

interface CardPickerProps {
  activeTarget: PlayerTarget;
}

export function CardPicker({ activeTarget }: CardPickerProps) {
  const playerCards = useGameStore((s) => s.playerCards);
  const opponentCards = useGameStore((s) => s.opponentCards);
  const addCard = useGameStore((s) => s.addCard);
  const status = useGameStore((s) => s.status);

  const isSolving = status === 'solving';

  // Compute used counts across both hands for each value (index 0 = value 1, ..., index 14 = value 15)
  const usedCounts = new Array(15).fill(0);
  for (const v of playerCards) usedCounts[v - 1]++;
  for (const v of opponentCards) usedCounts[v - 1]++;

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <p className="text-sm text-gray-500 mb-2">点击选择手牌</p>

      {/* Regular cards: 4 suits x 13 values */}
      <div
        className="grid gap-1 mb-2"
        style={{ gridTemplateColumns: 'repeat(13, 1fr)' }}
      >
        {SUITS.map((suit) =>
          FACE_VALUES.map((value) => {
            const max = maxCountForValue(value);
            const isDisabled = usedCounts[value - 1] >= max || isSolving;

            return (
              <CardFace
                key={`${suit}-${value}`}
                value={value}
                suit={suit as Suit}
                state={isDisabled ? 'disabled' : 'default'}
                onClick={isDisabled ? undefined : () => addCard(activeTarget, value)}
              />
            );
          }),
        )}
      </div>

      {/* Jokers row */}
      <div className="flex justify-center gap-1">
        {JOKER_VALUES.map((jokerValue) => {
          const max = maxCountForValue(jokerValue);
          const isDisabled = usedCounts[jokerValue - 1] >= max || isSolving;

          return (
            <CardFace
              key={`joker-${jokerValue}`}
              value={jokerValue}
              state={isDisabled ? 'disabled' : 'default'}
              onClick={isDisabled ? undefined : () => addCard(activeTarget, jokerValue)}
            />
          );
        })}
      </div>
    </div>
  );
}
