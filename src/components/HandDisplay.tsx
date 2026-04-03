import { useGameStore, type PlayerTarget } from '../store/game-store';
import { CardFace } from './CardFace';

interface HandDisplayProps {
  cards: number[];
  target: PlayerTarget;
  label: string;
}

export function HandDisplay({ cards, target, label }: HandDisplayProps) {
  const removeCard = useGameStore((s) => s.removeCard);
  const status = useGameStore((s) => s.status);

  const isSolving = status === 'solving';

  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 mb-1">
        {label} ({cards.length}张)
      </div>
      {cards.length === 0 ? (
        <p className="text-sm text-gray-400">
          点击上方牌面，分别选择残局手牌
        </p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {cards.map((cardValue, index) => (
            <CardFace
              key={`${cardValue}-${index}`}
              value={cardValue}
              size="small"
              onClick={isSolving ? undefined : () => removeCard(target, cardValue)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
