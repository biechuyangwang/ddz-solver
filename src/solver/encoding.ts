import type { Hand, Move } from './types.js';
import { CARD_COUNT } from './constants.js';

/**
 * Create a count-based hand representation from an array of card values.
 * Card values: 1=A, 2-10, 11=J, 12=Q, 13=K, 14=Small Joker, 15=Big Joker
 * Result: counts[0] = # of Aces, ..., counts[14] = # of Big Jokers
 */
export function createHand(cards: number[]): Hand {
  const counts = new Array(CARD_COUNT).fill(0) as Hand;
  for (const card of cards) {
    counts[card - 1]++;
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
    newHand[card - 1]--;
  }
  return newHand;
}

/**
 * Create a shallow copy of a hand array.
 */
export function cloneHand(hand: Hand): Hand {
  return [...hand] as Hand;
}
