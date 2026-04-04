import type { Hand, Move } from './types.js';
import { CARD_COUNT } from './constants.js';

/**
 * DDZ ranking order for hand indices:
 *   Index:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
 *   Card:   3  4  5  6  7  8  9  10 J  Q  K  A  2  SJ BJ
 *   Value:  3  4  5  6  7  8  9  10 11 12 13 1  2  14 15
 *
 * Higher index = stronger card. This matches DDZ ranking:
 *   3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 2 < 小王 < 大王
 */

/** Convert card value (1-15) to hand index (0-14) ordered by DDZ rank */
export function cardToIndex(cv: number): number {
  if (cv >= 3 && cv <= 13) return cv - 3; // 3→0, 4→1, ..., K→10
  if (cv === 1) return 11; // A → 11
  if (cv === 2) return 12; // 2 → 12
  if (cv === 14) return 13; // 小王 → 13
  if (cv === 15) return 14; // 大王 → 14
  throw new Error(`Invalid card value: ${cv}`);
}

/** Convert hand index (0-14) back to card value (1-15) */
export function indexToCard(idx: number): number {
  if (idx >= 0 && idx <= 10) return idx + 3; // 0→3, ..., 10→13(K)
  if (idx === 11) return 1; // A
  if (idx === 12) return 2; // 2
  if (idx === 13) return 14; // 小王
  if (idx === 14) return 15; // 大王
  throw new Error(`Invalid index: ${idx}`);
}

/** DDZ rank indices valid for sequential types (straights, pairs, airplanes): 3 through A */
export const SEQUENTIAL_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * Create a count-based hand representation from an array of card values.
 * Card values: 1=A, 2-10, 11=J, 12=Q, 13=K, 14=Small Joker, 15=Big Joker
 * Result: counts ordered by DDZ rank (index 0=3, ..., 11=A, 12=2, 13=小王, 14=大王)
 */
export function createHand(cards: number[]): Hand {
  const counts = new Array(CARD_COUNT).fill(0) as Hand;
  for (const card of cards) {
    counts[cardToIndex(card)]++;
  }
  return counts;
}

/**
 * Check if a hand has no cards remaining.
 */
export function handIsEmpty(hand: Hand): boolean {
  return hand.every((c) => c === 0);
}

/**
 * Count total number of cards in a hand.
 */
export function handSize(hand: Hand): number {
  return hand.reduce((sum, c) => sum + c, 0);
}

/**
 * Apply a move to a hand, returning a new hand with the move's cards removed.
 * Does not mutate the original hand.
 */
export function applyMove(hand: Hand, move: Move): Hand {
  const newHand = [...hand] as Hand;
  for (const card of move.cards) {
    newHand[cardToIndex(card)]--;
  }
  return newHand;
}

/**
 * Create a shallow copy of a hand array.
 */
export function cloneHand(hand: Hand): Hand {
  return [...hand] as Hand;
}
