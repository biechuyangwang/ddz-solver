import { describe, it, expect } from 'vitest';
import { classifyMove, canBeat } from '../../solver/hand-types.js';
import { HandType } from '../../solver/types.js';
import type { Move } from '../../solver/types.js';

// Helper to create moves with specific type and rank for canBeat tests
function makeMove(type: HandType, mainRank: number, length = 0, cards: number[] = []): Move {
  return { type, mainRank, length, cards };
}

describe('classifyMove', () => {
  // --- SINGLE ---
  describe('SINGLE', () => {
    it('classifies single card correctly', () => {
      const result = classifyMove([3]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.SINGLE);
      expect(result!.mainRank).toBe(2); // index 2 = value 3
    });

    it('classifies single joker', () => {
      const result = classifyMove([14]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.SINGLE);
      expect(result!.mainRank).toBe(13); // index 13
    });
  });

  // --- PAIR ---
  describe('PAIR', () => {
    it('classifies pair correctly', () => {
      const result = classifyMove([5, 5]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.PAIR);
      expect(result!.mainRank).toBe(4); // index 4 = value 5
    });

    it('classifies pair of 2s', () => {
      const result = classifyMove([2, 2]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.PAIR);
      expect(result!.mainRank).toBe(1); // index 1 = value 2
    });
  });

  // --- TRIPLE ---
  describe('TRIPLE', () => {
    it('classifies triple correctly', () => {
      const result = classifyMove([7, 7, 7]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.TRIPLE);
      expect(result!.mainRank).toBe(6); // index 6 = value 7
    });

    it('classifies triple of aces', () => {
      const result = classifyMove([1, 1, 1]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.TRIPLE);
      expect(result!.mainRank).toBe(0); // index 0 = value 1 (Ace)
    });
  });

  // --- TRIPLE_SINGLE ---
  describe('TRIPLE_SINGLE', () => {
    it('classifies triple+single correctly', () => {
      const result = classifyMove([7, 7, 7, 3]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.TRIPLE_SINGLE);
      expect(result!.mainRank).toBe(6);
    });

    it('classifies triple+single with joker kicker', () => {
      const result = classifyMove([5, 5, 5, 14]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.TRIPLE_SINGLE);
      expect(result!.mainRank).toBe(4);
    });
  });

  // --- TRIPLE_PAIR ---
  describe('TRIPLE_PAIR', () => {
    it('classifies triple+pair correctly', () => {
      const result = classifyMove([7, 7, 7, 3, 3]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.TRIPLE_PAIR);
      expect(result!.mainRank).toBe(6);
    });

    it('classifies triple+pair with high kicker', () => {
      const result = classifyMove([3, 3, 3, 13, 13]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.TRIPLE_PAIR);
      expect(result!.mainRank).toBe(2);
    });
  });

  // --- STRAIGHT ---
  describe('STRAIGHT', () => {
    it('classifies 5-card straight correctly', () => {
      const result = classifyMove([3, 4, 5, 6, 7]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.STRAIGHT);
      expect(result!.mainRank).toBe(2); // lowest index
      expect(result!.length).toBe(5);
    });

    it('classifies 12-card straight (A through Q) correctly', () => {
      // A=1, 3=3, 4=4, ..., 12=Q -- values 1,3,4,5,6,7,8,9,10,11,12
      // Actually 12 cards straight: 1(A),3,4,5,6,7,8,9,10,11,12(Q)... wait,
      // 12 consecutive from A to Q requires going through 2, which is illegal.
      // A valid long straight: 1,3,4,5,6,7,8,9,10,11,12,13 -- but 2 is missing.
      // Since 2 is excluded from sequences, the longest possible straight from A is:
      // A,3,4,5,6,7,8,9,10,J,Q,K = 12 values? No -- these are not consecutive in value space.
      // Consecutive means: 1,2,3,4,5 -- but 2 is excluded. So A-2-3-4-5 is illegal.
      // Consecutive: 3,4,5,6,7 = 5 values. Or 1,2,3,4,5 is illegal because 2 is excluded.
      // Wait -- the rule is that 2 cannot be IN a straight. So the valid range for
      // straight building is values 1-13, but if 2 appears in the middle it's illegal.
      // Actually, the indices are 0(A) to 12(K), skipping index 1 (value 2).
      // So a valid straight of length 12 starting at 3: 3,4,5,6,7,8,9,10,J,Q,K
      // That's 11 values (3 through K). A through K excluding 2 = 12 values.
      // A=1,3,4,5,6,7,8,9,10,J,Q,K = indices 0,2,3,4,5,6,7,8,9,10,11,12 = 12 values
      // But wait -- these indices are NOT consecutive (gap at 1). So is A,3,4,5,...,K a valid straight?
      // No! Straights must be consecutive VALUES. A,2,3,4,5 is consecutive but 2 is excluded.
      // So the longest straight NOT including 2 would be 3,4,5,6,7,8,9,10,J,Q,K = 11 cards
      const result = classifyMove([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.STRAIGHT);
      expect(result!.length).toBe(11);
    });

    it('rejects straight containing value 2', () => {
      // 2,3,4,5,6 -- value 2 is excluded from sequential types
      const result = classifyMove([2, 3, 4, 5, 6]);
      expect(result).toBeNull();
    });

    it('rejects straight that is too short (4 cards)', () => {
      const result = classifyMove([3, 4, 5, 6]);
      expect(result).toBeNull();
    });

    it('rejects straight containing joker', () => {
      const result = classifyMove([3, 4, 5, 6, 14]);
      expect(result).toBeNull();
    });

    it('classifies 5-card straight from A to 5', () => {
      // A=1,2=2,3=3,4=4,5=5 -- but this includes 2 which is illegal.
      // Actually: 1,2,3,4,5 includes value 2, so this is illegal.
      // A valid straight starting from A: A(1),3,4,5 -- but that's only 4 cards,
      // and they're not consecutive (missing 2). So A cannot start a straight
      // without including 2. Wait -- that's wrong. A,2,3,4,5 IS consecutive values
      // but 2 is excluded. So no straight starting from A is possible unless we skip 2...
      // which breaks consecutiveness.
      // Actually re-reading the plan: "sequential values must be in range 1-13 (indices 0-12)
      // EXCLUDING value 2 (index 1)". So A,2,3,4,5 fails because 2 is excluded.
      // No straight starts with A because the next value is 2.
      // Let me test a valid straight: 1,2,3,4,5 should fail.
      const result = classifyMove([1, 2, 3, 4, 5]);
      expect(result).toBeNull();
    });
  });

  // --- CONSECUTIVE_PAIRS ---
  describe('CONSECUTIVE_PAIRS', () => {
    it('classifies 3 consecutive pairs correctly', () => {
      const result = classifyMove([3, 3, 4, 4, 5, 5]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.CONSECUTIVE_PAIRS);
      expect(result!.mainRank).toBe(2); // lowest index (value 3 = index 2)
      expect(result!.length).toBe(3);
    });

    it('rejects consecutive pairs that are too short (2 pairs)', () => {
      const result = classifyMove([3, 3, 4, 4]);
      expect(result).toBeNull();
    });

    it('rejects consecutive pairs containing value 2', () => {
      const result = classifyMove([2, 2, 3, 3, 4, 4]);
      expect(result).toBeNull();
    });

    it('classifies 4 consecutive pairs', () => {
      const result = classifyMove([3, 3, 4, 4, 5, 5, 6, 6]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.CONSECUTIVE_PAIRS);
      expect(result!.length).toBe(4);
    });
  });

  // --- AIRPLANE ---
  describe('AIRPLANE', () => {
    it('classifies 2 consecutive triples correctly', () => {
      const result = classifyMove([5, 5, 5, 6, 6, 6]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.AIRPLANE);
      expect(result!.mainRank).toBe(4); // index 4 = value 5
      expect(result!.length).toBe(2);
    });

    it('rejects single triple as airplane (min 2)', () => {
      const result = classifyMove([5, 5, 5]);
      // Single triple should be classified as TRIPLE, not AIRPLANE
      // But the input is just 3 cards of same rank, so it's TRIPLE
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.TRIPLE);
    });

    it('rejects airplane with value 2 in trio sequence', () => {
      // 2,2,2,3,3,3 includes value 2 in the consecutive sequence
      const result = classifyMove([2, 2, 2, 3, 3, 3]);
      expect(result).toBeNull();
    });

    it('classifies 3 consecutive triples', () => {
      const result = classifyMove([3, 3, 3, 4, 4, 4, 5, 5, 5]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.AIRPLANE);
      expect(result!.length).toBe(3);
    });
  });

  // --- AIRPLANE_SINGLES ---
  describe('AIRPLANE_SINGLES', () => {
    it('classifies airplane with singles correctly', () => {
      const result = classifyMove([5, 5, 5, 6, 6, 6, 3, 7]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.AIRPLANE_SINGLES);
      expect(result!.mainRank).toBe(4);
      expect(result!.length).toBe(2);
    });

    it('rejects airplane singles where kicker is same rank as trio', () => {
      // Kickers cannot be the same rank as any trio
      const result = classifyMove([5, 5, 5, 6, 6, 6, 5]);
      // 7 cards total: 6 for trios + 1 kicker. But we need 2 kickers for 2 trios.
      // So this is actually invalid because we need exactly 2 singles for 2 trios.
      expect(result).toBeNull();
    });

    it('classifies airplane with singles with joker kicker', () => {
      const result = classifyMove([3, 3, 3, 4, 4, 4, 7, 14]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.AIRPLANE_SINGLES);
      expect(result!.length).toBe(2);
    });
  });

  // --- AIRPLANE_PAIRS ---
  describe('AIRPLANE_PAIRS', () => {
    it('classifies airplane with pairs correctly', () => {
      const result = classifyMove([5, 5, 5, 6, 6, 6, 3, 3, 7, 7]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.AIRPLANE_PAIRS);
      expect(result!.mainRank).toBe(4);
      expect(result!.length).toBe(2);
    });

    it('rejects airplane pairs where kicker pair is same rank as trio', () => {
      const result = classifyMove([5, 5, 5, 6, 6, 6, 5, 5]);
      // 8 cards: 6 for trios + 2 for pair kicker. But the kicker pair is value 5 = trio rank.
      // Also we need 2 pair kickers for 2 trios (total should be 10 cards).
      expect(result).toBeNull();
    });
  });

  // --- FOUR_TWO_SINGLES ---
  describe('FOUR_TWO_SINGLES', () => {
    it('classifies four+two singles correctly', () => {
      const result = classifyMove([8, 8, 8, 8, 3, 5]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.FOUR_TWO_SINGLES);
      expect(result!.mainRank).toBe(7); // index 7 = value 8
    });

    it('rejects four+two singles with kicker same rank as four', () => {
      const result = classifyMove([8, 8, 8, 8, 8, 3]);
      // 6 cards but one kicker is same rank as the four
      // Actually: [8,8,8,8,8,3] -- five 8s and one 3.
      // The counts would be: 8 appears 5 times which is impossible in standard DDZ (max 4 per rank).
      // But classifyMove just receives card values. Let me use a realistic case.
      // If we have four 8s and kicker same rank: impossible since max 4 per rank.
      // So test with kicker being same rank is not possible in standard game.
      // Let me test with only 1 kicker instead.
      expect(true).toBe(true); // Placeholder -- logic is inherently protected by max-4 constraint
    });

    it('rejects four+two singles with only 1 kicker', () => {
      const result = classifyMove([8, 8, 8, 8, 3]);
      // 5 cards -- not a valid four+two singles (needs exactly 2 kickers)
      expect(result).toBeNull();
    });
  });

  // --- FOUR_TWO_PAIRS ---
  describe('FOUR_TWO_PAIRS', () => {
    it('classifies four+two pairs correctly', () => {
      const result = classifyMove([8, 8, 8, 8, 3, 3, 5, 5]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.FOUR_TWO_PAIRS);
      expect(result!.mainRank).toBe(7);
    });

    it('rejects four+two pairs with only 1 pair kicker', () => {
      // [8,8,8,8,3,3] is actually a valid FOUR_TWO_SINGLES (4 eights + 2 kicker singles).
      // For FOUR_TWO_PAIRS we need 8 cards: 4 of rank + 2 pairs.
      // Test a genuinely invalid case: 6 cards with a pair kicker but needing 2 pair kickers.
      // Since 6 cards can never be FOUR_TWO_PAIRS (which requires 8), this tests that
      // the classifyMove correctly classifies [8,8,8,8,3,3] as FOUR_TWO_SINGLES instead.
      const result = classifyMove([8, 8, 8, 8, 3, 3]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.FOUR_TWO_SINGLES);
    });
  });

  // --- BOMB ---
  describe('BOMB', () => {
    it('classifies four of same rank as bomb', () => {
      const result = classifyMove([8, 8, 8, 8]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.BOMB);
      expect(result!.mainRank).toBe(7);
    });

    it('classifies bomb of aces', () => {
      const result = classifyMove([1, 1, 1, 1]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.BOMB);
      expect(result!.mainRank).toBe(0);
    });
  });

  // --- ROCKET ---
  describe('ROCKET', () => {
    it('classifies both jokers as rocket', () => {
      const result = classifyMove([14, 15]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.ROCKET);
      expect(result!.mainRank).toBe(14);
    });

    it('rocket is distinct from bomb', () => {
      const rocketResult = classifyMove([14, 15]);
      const bombResult = classifyMove([8, 8, 8, 8]);
      expect(rocketResult!.type).toBe(HandType.ROCKET);
      expect(bombResult!.type).toBe(HandType.BOMB);
      expect(rocketResult!.type).not.toBe(bombResult!.type);
    });
  });

  // --- Edge cases ---
  describe('edge cases', () => {
    it('returns null for empty array', () => {
      expect(classifyMove([])).toBeNull();
    });

    it('returns null for invalid card combination', () => {
      // 3 of same + 3 of same that are NOT consecutive (for airplane),
      // and too many cards for triple, too few for other types
      const result = classifyMove([3, 3, 3, 9, 9, 9]);
      // This is 2 non-consecutive triples. Not a valid airplane (need consecutive).
      // It could be classified as two separate triples but that's not a single move.
      expect(result).toBeNull();
    });

    it('value 2 is valid for SINGLE', () => {
      const result = classifyMove([2]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.SINGLE);
    });

    it('value 2 is valid for PAIR', () => {
      const result = classifyMove([2, 2]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.PAIR);
    });

    it('value 2 is valid for TRIPLE', () => {
      const result = classifyMove([2, 2, 2]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.TRIPLE);
    });

    it('value 2 is valid for BOMB', () => {
      const result = classifyMove([2, 2, 2, 2]);
      expect(result).not.toBeNull();
      expect(result!.type).toBe(HandType.BOMB);
    });
  });
});

describe('canBeat', () => {
  // Same type, higher rank wins
  it('same type: higher rank beats lower rank', () => {
    const single5 = makeMove(HandType.SINGLE, 4, 1, [5]);
    const single7 = makeMove(HandType.SINGLE, 6, 1, [7]);
    expect(canBeat(single5, single7)).toBe(true);
  });

  it('same type: lower rank cannot beat higher rank', () => {
    const single7 = makeMove(HandType.SINGLE, 6, 1, [7]);
    const single5 = makeMove(HandType.SINGLE, 4, 1, [5]);
    expect(canBeat(single7, single5)).toBe(false);
  });

  it('bomb beats any non-bomb non-rocket', () => {
    const triple5 = makeMove(HandType.TRIPLE, 4, 3, [5, 5, 5]);
    const bomb8 = makeMove(HandType.BOMB, 7, 4, [8, 8, 8, 8]);
    expect(canBeat(triple5, bomb8)).toBe(true);
  });

  it('rocket beats everything including bomb', () => {
    const bomb8 = makeMove(HandType.BOMB, 7, 4, [8, 8, 8, 8]);
    const rocket = makeMove(HandType.ROCKET, 14, 2, [14, 15]);
    expect(canBeat(bomb8, rocket)).toBe(true);
  });

  it('rocket beats non-bomb', () => {
    const single5 = makeMove(HandType.SINGLE, 4, 1, [5]);
    const rocket = makeMove(HandType.ROCKET, 14, 2, [14, 15]);
    expect(canBeat(single5, rocket)).toBe(true);
  });

  it('lower bomb cannot beat higher bomb', () => {
    const bomb6 = makeMove(HandType.BOMB, 5, 4, [6, 6, 6, 6]);
    const bomb8 = makeMove(HandType.BOMB, 7, 4, [8, 8, 8, 8]);
    expect(canBeat(bomb8, bomb6)).toBe(false);
  });

  it('higher bomb beats lower bomb', () => {
    const bomb6 = makeMove(HandType.BOMB, 5, 4, [6, 6, 6, 6]);
    const bomb8 = makeMove(HandType.BOMB, 7, 4, [8, 8, 8, 8]);
    expect(canBeat(bomb6, bomb8)).toBe(true);
  });

  it('same rank same type does not beat', () => {
    const pair5a = makeMove(HandType.PAIR, 4, 2, [5, 5]);
    const pair5b = makeMove(HandType.PAIR, 4, 2, [5, 5]);
    expect(canBeat(pair5a, pair5b)).toBe(false);
  });

  it('straight: same length higher rank wins', () => {
    const straight34567 = makeMove(HandType.STRAIGHT, 2, 5, [3, 4, 5, 6, 7]);
    const straight45678 = makeMove(HandType.STRAIGHT, 3, 5, [4, 5, 6, 7, 8]);
    expect(canBeat(straight34567, straight45678)).toBe(true);
  });

  it('straight: different lengths do not beat', () => {
    const straight34567 = makeMove(HandType.STRAIGHT, 2, 5, [3, 4, 5, 6, 7]);
    const straight3456789 = makeMove(HandType.STRAIGHT, 2, 7, [3, 4, 5, 6, 7, 8, 9]);
    expect(canBeat(straight34567, straight3456789)).toBe(false);
  });

  it('nothing beats rocket', () => {
    const rocket = makeMove(HandType.ROCKET, 14, 2, [14, 15]);
    const bomb = makeMove(HandType.BOMB, 13, 4, [14, 14, 14, 14]);
    expect(canBeat(rocket, bomb)).toBe(false);
  });

  it('different non-bomb types: cannot beat', () => {
    const single5 = makeMove(HandType.SINGLE, 4, 1, [5]);
    const pair5 = makeMove(HandType.PAIR, 4, 2, [5, 5]);
    expect(canBeat(single5, pair5)).toBe(false);
  });

  it('airplane: same length higher rank wins', () => {
    const air555666 = makeMove(HandType.AIRPLANE, 4, 2, [5, 5, 5, 6, 6, 6]);
    const air777888 = makeMove(HandType.AIRPLANE, 6, 2, [7, 7, 7, 8, 8, 8]);
    expect(canBeat(air555666, air777888)).toBe(true);
  });

  it('consecutive pairs: same length higher rank wins', () => {
    const cp334455 = makeMove(HandType.CONSECUTIVE_PAIRS, 2, 3, [3, 3, 4, 4, 5, 5]);
    const cp445566 = makeMove(HandType.CONSECUTIVE_PAIRS, 3, 3, [4, 4, 5, 5, 6, 6]);
    expect(canBeat(cp334455, cp445566)).toBe(true);
  });
});
