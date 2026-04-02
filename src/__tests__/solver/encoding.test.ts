import { describe, it, expect } from 'vitest';
import { createHand, handIsEmpty, handSize, applyMove, cloneHand } from '../../solver/encoding.js';
import { HandType } from '../../solver/types.js';
import { PASS_MOVE } from '../../solver/types.js';
import { combinations } from '../../solver/utils.js';

describe('createHand', () => {
  it('converts mixed card values to count array', () => {
    // [3, 3, 5] -> index 2 has count 2 (value 3), index 4 has count 1 (value 5)
    const hand = createHand([3, 3, 5]);
    expect(hand).toEqual([0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('handles jokers at indices 13 and 14', () => {
    // [14, 15] -> small joker at index 13, big joker at index 14
    const hand = createHand([14, 15]);
    expect(hand).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1]);
  });

  it('returns all-zero array for empty input', () => {
    const hand = createHand([]);
    expect(hand).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('handles single card correctly', () => {
    // value 1 = Ace, index 0
    const hand = createHand([1]);
    expect(hand).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('handles four of the same card', () => {
    const hand = createHand([7, 7, 7, 7]);
    expect(hand[6]).toBe(4); // index 6 = value 7
  });

  it('always returns array of length 15', () => {
    const hand = createHand([1, 2, 3]);
    expect(hand).toHaveLength(15);
  });
});

describe('handIsEmpty', () => {
  it('returns true for all-zero array', () => {
    expect(handIsEmpty([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(true);
  });

  it('returns false when any counter is non-zero', () => {
    expect(handIsEmpty([0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(false);
  });

  it('returns true for hand created from empty cards', () => {
    expect(handIsEmpty(createHand([]))).toBe(true);
  });
});

describe('handSize', () => {
  it('sums all counters correctly', () => {
    // [2,0,1,...] = 2+0+1 = 3
    expect(handSize([2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).toBe(3);
  });

  it('returns 0 for empty hand', () => {
    expect(handSize(createHand([]))).toBe(0);
  });

  it('returns 5 for hand with 5 cards', () => {
    expect(handSize(createHand([3, 3, 5, 7, 9]))).toBe(5);
  });
});

describe('applyMove', () => {
  it('removes cards specified in move from hand', () => {
    const hand = createHand([3, 3, 5]);
    // Move: play two 3s (value 3 = index 2)
    const move = {
      type: HandType.PAIR,
      mainRank: 2,
      length: 2,
      cards: [3, 3],
    };
    const result = applyMove(hand, move);
    // Should remove both 3s, leaving only the 5
    expect(result).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('does not mutate the original hand', () => {
    const hand = createHand([3, 3, 5]);
    const move = {
      type: HandType.PAIR,
      mainRank: 2,
      length: 2,
      cards: [3, 3],
    };
    applyMove(hand, move);
    // Original hand unchanged
    expect(hand).toEqual([0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('removes single card correctly', () => {
    const hand = createHand([3, 5, 7]);
    const move = {
      type: HandType.SINGLE,
      mainRank: 4,
      length: 1,
      cards: [5],
    };
    const result = applyMove(hand, move);
    expect(result[4]).toBe(0); // value 5 at index 4 should be 0
    expect(handSize(result)).toBe(2);
  });

  it('handles PASS move (no cards removed)', () => {
    const hand = createHand([3, 5]);
    const result = applyMove(hand, PASS_MOVE);
    expect(result).toEqual(hand);
  });
});

describe('cloneHand', () => {
  it('returns equal array', () => {
    const hand = createHand([3, 3, 5]);
    const cloned = cloneHand(hand);
    expect(cloned).toEqual(hand);
  });

  it('returns distinct reference', () => {
    const hand = createHand([3, 3, 5]);
    const cloned = cloneHand(hand);
    expect(cloned).not.toBe(hand);
  });

  it('modifying clone does not affect original', () => {
    const hand = createHand([3, 3, 5]);
    const cloned = cloneHand(hand);
    cloned[2] = 0;
    expect(hand[2]).toBe(2);
  });
});

describe('combinations', () => {
  it('generates correct C(3,2) results', () => {
    const results = [...combinations([1, 2, 3], 2)];
    expect(results).toEqual([[1, 2], [1, 3], [2, 3]]);
  });

  it('generates correct C(4,3) results', () => {
    const results = [...combinations([1, 2, 3, 4], 3)];
    expect(results).toEqual([[1, 2, 3], [1, 2, 4], [1, 3, 4], [2, 3, 4]]);
  });

  it('yields empty array for k=0', () => {
    const results = [...combinations([1], 0)];
    expect(results).toEqual([[]]);
  });

  it('yields nothing for empty array with k=1', () => {
    const results = [...combinations([], 1)];
    expect(results).toEqual([]);
  });

  it('yields nothing when k exceeds array length', () => {
    const results = [...combinations([1, 2], 3)];
    expect(results).toEqual([]);
  });

  it('yields single element arrays for C(n,1)', () => {
    const results = [...combinations([1, 2, 3], 1)];
    expect(results).toEqual([[1], [2], [3]]);
  });

  it('handles C(5,2) correctly', () => {
    const results = [...combinations([1, 2, 3, 4, 5], 2)];
    expect(results).toHaveLength(10);
    expect(results[0]).toEqual([1, 2]);
    expect(results[9]).toEqual([4, 5]);
  });
});
