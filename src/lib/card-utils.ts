export const SUITS = ['spade', 'heart', 'club', 'diamond'] as const;
export type Suit = (typeof SUITS)[number];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spade: '\u2660',   // ♠
  heart: '\u2665',   // ♥
  club: '\u2663',    // ♣
  diamond: '\u2666', // ♦
};

export const VALUE_DISPLAY: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
  14: '小王', // Small Joker
  15: '大王', // Big Joker
};

/** Face values for regular cards (A through K) */
export const FACE_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const;

/** Card values for jokers */
export const JOKER_VALUES = [14, 15] as const;

export function isRedSuit(suit: Suit): boolean {
  return suit === 'heart' || suit === 'diamond';
}

/** Max count per card value: 4 for values 1-13, 1 for jokers 14/15 */
export function maxCountForValue(value: number): number {
  return value >= 14 ? 1 : 4;
}

/** Chinese aria-label for a specific card. E.g. "黑桃A", "红心K", "小王", "大王" */
export function cardAriaLabel(value: number, suit?: Suit): string {
  if (value === 14) return '小王';
  if (value === 15) return '大王';
  const suitNames: Record<Suit, string> = {
    spade: '黑桃', heart: '红心', club: '梅花', diamond: '方块',
  };
  return `${suitNames[suit!]}${VALUE_DISPLAY[value]}`;
}

import { HandType } from '../solver/types';
import type { Move } from '../solver/types';

/** Format a move into a human-readable Chinese label */
export function formatMoveLabel(move: Move): string {
  if (move.type === HandType.PASS) return '过';
  if (move.type === HandType.ROCKET) return '火箭';
  if (move.type === HandType.BOMB) return `炸弹 ${VALUE_DISPLAY[move.mainRank + 1] ?? move.mainRank + 1}`;

  const rank = (r: number) => VALUE_DISPLAY[r + 1] ?? String(r + 1);
  const cards = move.cards.map(v => VALUE_DISPLAY[v] ?? String(v));

  switch (move.type) {
    case HandType.SINGLE: return `单 ${rank(move.mainRank)}`;
    case HandType.PAIR: return `对 ${rank(move.mainRank)}`;
    case HandType.TRIPLE: return `三条 ${rank(move.mainRank)}`;
    case HandType.TRIPLE_SINGLE: return `三带一 ${rank(move.mainRank)}`;
    case HandType.TRIPLE_PAIR: return `三带二 ${rank(move.mainRank)}`;
    case HandType.STRAIGHT: return `顺子 ${cards.join('')}`;
    case HandType.CONSECUTIVE_PAIRS: return `连对 ${cards.join('')}`;
    case HandType.AIRPLANE: return `飞机 ${cards.join('')}`;
    case HandType.AIRPLANE_SINGLES: return `飞机带单 ${cards.join('')}`;
    case HandType.AIRPLANE_PAIRS: return `飞机带对 ${cards.join('')}`;
    case HandType.FOUR_TWO_SINGLES: return `四带二 ${cards.join('')}`;
    case HandType.FOUR_TWO_PAIRS: return `四带两对 ${cards.join('')}`;
    default: return cards.join(' ');
  }
}
