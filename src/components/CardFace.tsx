import type { Suit } from '../lib/card-utils';
import { SUIT_SYMBOLS, VALUE_DISPLAY, cardAriaLabel, isRedSuit } from '../lib/card-utils';
import { cn } from '../lib/cn';

export interface CardFaceProps {
  value: number;
  suit?: Suit;
  state?: 'default' | 'selected' | 'disabled' | 'hover';
  count?: number;
  onClick?: () => void;
  /** Override width/height for smaller variant (e.g. hand display) */
  size?: 'normal' | 'small';
}

const sizeStyles = {
  normal: { width: '48px', height: '64px' },
  small: { width: '40px', height: '56px' },
} as const;

export function CardFace({
  value,
  suit,
  state = 'default',
  count,
  onClick,
  size = 'normal',
}: CardFaceProps) {
  const isJoker = value >= 14;
  const isDisabled = state === 'disabled';

  // Determine suit color class
  const suitColorClass =
    isJoker
      ? value === 15
        ? 'text-suit-red'
        : 'text-suit-black'
      : suit && isRedSuit(suit)
        ? 'text-suit-red'
        : 'text-suit-black';

  // State-based classes
  const stateClasses = {
    default: 'bg-white border border-gray-300',
    selected: 'bg-blue-50 border-2 border-blue-600',
    disabled: 'bg-card-disabled border border-gray-200 text-gray-400',
    hover: 'bg-white border border-gray-300',
  };

  const interactiveClasses =
    !isDisabled && onClick
      ? 'cursor-pointer hover:bg-gray-50 hover:border-gray-400'
      : '';

  const disabledClasses = isDisabled ? 'cursor-not-allowed' : '';

  const handleClick = isDisabled ? undefined : onClick;

  // Determine aria-label
  const ariaLabel = cardAriaLabel(value, suit);

  return (
    <button
      type="button"
      className={cn(
        'relative flex flex-col items-center justify-center rounded-lg transition-colors select-none',
        stateClasses[state],
        suitColorClass,
        interactiveClasses,
        disabledClasses,
      )}
      style={sizeStyles[size]}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
    >
      {isJoker ? (
        <span
          className={cn(
            'text-xs font-semibold leading-tight',
            isDisabled && 'text-gray-400',
          )}
        >
          {VALUE_DISPLAY[value]}
        </span>
      ) : (
        <>
          <span
            className={cn(
              'text-sm leading-none',
              isDisabled && 'text-gray-400',
            )}
          >
            {SUIT_SYMBOLS[suit!]}
          </span>
          <span
            className={cn(
              'text-base font-semibold leading-tight',
              isDisabled && 'text-gray-400',
            )}
          >
            {VALUE_DISPLAY[value]}
          </span>
        </>
      )}
      {count !== undefined && count > 1 && (
        <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
