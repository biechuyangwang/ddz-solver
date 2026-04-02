/** Minimum number of cards in a straight */
export const MIN_STRAIGHT_LENGTH = 5;

/** Minimum number of consecutive pairs */
export const MIN_CONSECUTIVE_PAIRS_LENGTH = 3;

/** Minimum number of consecutive triples in an airplane */
export const MIN_AIRPLANE_LENGTH = 2;

/** Highest card value index allowed in sequential types (K=12, which is card value 13).
 *  Value 2 (index 1) is excluded from sequential types. */
export const MAX_SEQUENTIAL_VALUE = 13;

/** Number of distinct card values (1-13 + small joker + big joker) */
export const CARD_COUNT = 15;

/** Default solver time budget in milliseconds (10 seconds, per SOLV-07) */
export const DEFAULT_TIME_BUDGET = 10000;
