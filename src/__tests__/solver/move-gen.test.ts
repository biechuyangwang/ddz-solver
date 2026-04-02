import { describe, it, expect } from 'vitest';
import { createHand } from '../../solver/encoding.js';
import { HandType } from '../../solver/types.js';
import { PASS_MOVE } from '../../solver/types.js';
import type { Move } from '../../solver/types.js';
import { generateLeadingMoves, generateFollowingMoves } from '../../solver/move-gen.js';

// Helper: find moves by type
function findMovesByType(moves: Move[], type: HandType): Move[] {
  return moves.filter(m => m.type === type);
}

// Helper: check if a specific move exists in the list
function hasMove(moves: Move[], type: HandType, mainRank: number): boolean {
  return moves.some(m => m.type === type && m.mainRank === mainRank);
}

// Helper: check if a specific move with exact cards exists
function hasMoveWithCards(moves: Move[], type: HandType, cards: number[]): boolean {
  return moves.some(m => {
    if (m.type !== type) return false;
    const sorted1 = [...m.cards].sort((a, b) => a - b);
    const sorted2 = [...cards].sort((a, b) => a - b);
    return sorted1.length === sorted2.length && sorted1.every((v, i) => v === sorted2[i]);
  });
}

describe('generateLeadingMoves', () => {
  it('Hand [3,5,7]: generates 3 SINGLE moves, no pairs/triples/bombs', () => {
    const hand = createHand([3, 5, 7]);
    const moves = generateLeadingMoves(hand);

    const singles = findMovesByType(moves, HandType.SINGLE);
    expect(singles).toHaveLength(3);
    expect(hasMove(moves, HandType.SINGLE, 2)).toBe(true); // value 3 = index 2
    expect(hasMove(moves, HandType.SINGLE, 4)).toBe(true); // value 5 = index 4
    expect(hasMove(moves, HandType.SINGLE, 6)).toBe(true); // value 7 = index 6

    expect(findMovesByType(moves, HandType.PAIR)).toHaveLength(0);
    expect(findMovesByType(moves, HandType.TRIPLE)).toHaveLength(0);
    expect(findMovesByType(moves, HandType.BOMB)).toHaveLength(0);
    expect(findMovesByType(moves, HandType.ROCKET)).toHaveLength(0);
  });

  it('Hand [3,3,5]: generates 2 SINGLEs + 1 PAIR, no triples', () => {
    const hand = createHand([3, 3, 5]);
    const moves = generateLeadingMoves(hand);

    const singles = findMovesByType(moves, HandType.SINGLE);
    expect(singles).toHaveLength(2); // 3 and 5 (not duplicate 3)
    expect(hasMove(moves, HandType.SINGLE, 2)).toBe(true); // value 3
    expect(hasMove(moves, HandType.SINGLE, 4)).toBe(true); // value 5

    const pairs = findMovesByType(moves, HandType.PAIR);
    expect(pairs).toHaveLength(1);
    expect(hasMove(moves, HandType.PAIR, 2)).toBe(true); // pair of 3s

    expect(findMovesByType(moves, HandType.TRIPLE)).toHaveLength(0);
  });

  it('Hand [5,5,5,3]: generates SINGLEs (3,5), PAIR (5,5), TRIPLE (5,5,5), TRIPLE_SINGLE (5,5,5,3)', () => {
    const hand = createHand([5, 5, 5, 3]);
    const moves = generateLeadingMoves(hand);

    expect(hasMove(moves, HandType.SINGLE, 4)).toBe(true); // single 5
    expect(hasMove(moves, HandType.SINGLE, 2)).toBe(true); // single 3
    expect(hasMove(moves, HandType.PAIR, 4)).toBe(true); // pair of 5s
    expect(hasMove(moves, HandType.TRIPLE, 4)).toBe(true); // triple 5s
    expect(hasMoveWithCards(moves, HandType.TRIPLE_SINGLE, [5, 5, 5, 3])).toBe(true);
  });

  it('Hand [5,5,5,3,3]: generates SINGLEs, PAIRs, TRIPLE, TRIPLE_SINGLE, TRIPLE_PAIR', () => {
    const hand = createHand([5, 5, 5, 3, 3]);
    const moves = generateLeadingMoves(hand);

    expect(hasMove(moves, HandType.SINGLE, 4)).toBe(true); // single 5
    expect(hasMove(moves, HandType.SINGLE, 2)).toBe(true); // single 3
    expect(hasMove(moves, HandType.PAIR, 4)).toBe(true); // pair of 5s
    expect(hasMove(moves, HandType.PAIR, 2)).toBe(true); // pair of 3s
    expect(hasMove(moves, HandType.TRIPLE, 4)).toBe(true); // triple 5s
    expect(hasMoveWithCards(moves, HandType.TRIPLE_SINGLE, [5, 5, 5, 3])).toBe(true);
    expect(hasMoveWithCards(moves, HandType.TRIPLE_PAIR, [5, 5, 5, 3, 3])).toBe(true);
  });

  it('Hand [3,4,5,6,7]: generates 5 SINGLEs + 1 STRAIGHT', () => {
    const hand = createHand([3, 4, 5, 6, 7]);
    const moves = generateLeadingMoves(hand);

    const singles = findMovesByType(moves, HandType.SINGLE);
    expect(singles).toHaveLength(5);

    const straights = findMovesByType(moves, HandType.STRAIGHT);
    expect(straights).toHaveLength(1);
    expect(straights[0].mainRank).toBe(2); // lowest index = value 3
    expect(straights[0].length).toBe(5);
    expect(straights[0].cards).toEqual([3, 4, 5, 6, 7]);
  });

  it('Hand [3,4,5,6,7,8]: generates STRAIGHTs of length 5 and length 6', () => {
    const hand = createHand([3, 4, 5, 6, 7, 8]);
    const moves = generateLeadingMoves(hand);

    const straights = findMovesByType(moves, HandType.STRAIGHT);
    // 3 straights: 3-7 (len5), 4-8 (len5), 3-8 (len6)
    expect(straights).toHaveLength(3);

    const len5 = straights.filter(s => s.length === 5);
    const len6 = straights.filter(s => s.length === 6);
    expect(len5).toHaveLength(2); // 3-7 and 4-8
    expect(len6).toHaveLength(1); // 3-8
  });

  it('Hand with value 2 and 3,4,5,6,7: NO straight that includes value 2', () => {
    const hand = createHand([2, 3, 4, 5, 6, 7]);
    const moves = generateLeadingMoves(hand);

    const straights = findMovesByType(moves, HandType.STRAIGHT);
    // Only straight is 3-7 (length 5). No straight including value 2.
    for (const s of straights) {
      // None of the straight cards should be value 2
      expect(s.cards).not.toContain(2);
    }
    // Should still find the 3-7 straight
    expect(straights.some(s => s.mainRank === 2 && s.length === 5)).toBe(true);
  });

  it('Hand [3,3,4,4,5,5]: generates CONSECUTIVE_PAIRS', () => {
    const hand = createHand([3, 3, 4, 4, 5, 5]);
    const moves = generateLeadingMoves(hand);

    const cps = findMovesByType(moves, HandType.CONSECUTIVE_PAIRS);
    expect(cps).toHaveLength(1);
    expect(cps[0].mainRank).toBe(2); // index 2 = value 3
    expect(cps[0].length).toBe(3);
    expect(cps[0].cards).toEqual([3, 3, 4, 4, 5, 5]);
  });

  it('Hand [5,5,5,6,6,6]: generates AIRPLANE', () => {
    const hand = createHand([5, 5, 5, 6, 6, 6]);
    const moves = generateLeadingMoves(hand);

    const airplanes = findMovesByType(moves, HandType.AIRPLANE);
    expect(airplanes).toHaveLength(1);
    expect(airplanes[0].mainRank).toBe(4); // index 4 = value 5
    expect(airplanes[0].length).toBe(2);
    expect(airplanes[0].cards).toEqual([5, 5, 5, 6, 6, 6]);
  });

  it('Hand [5,5,5,6,6,6,3,7]: generates AIRPLANE_SINGLES with kickers NOT including 5 or 6', () => {
    const hand = createHand([5, 5, 5, 6, 6, 6, 3, 7]);
    const moves = generateLeadingMoves(hand);

    const airSingles = findMovesByType(moves, HandType.AIRPLANE_SINGLES);
    expect(airSingles.length).toBeGreaterThanOrEqual(1);

    for (const m of airSingles) {
      // Kicker ranks must not include 5 (index 4) or 6 (index 5)
      const mainCards = m.cards.slice(0, 6); // first 6 are trio cards
      const kickerCards = m.cards.slice(6); // remaining are kickers
      // kicker card values must not be 5 or 6
      for (const k of kickerCards) {
        expect(k).not.toBe(5);
        expect(k).not.toBe(6);
      }
    }
  });

  it('Hand [5,5,5,6,6,6,3,3,7,7]: generates AIRPLANE_PAIRS with pair kickers NOT including 5 or 6', () => {
    const hand = createHand([5, 5, 5, 6, 6, 6, 3, 3, 7, 7]);
    const moves = generateLeadingMoves(hand);

    const airPairs = findMovesByType(moves, HandType.AIRPLANE_PAIRS);
    expect(airPairs.length).toBeGreaterThanOrEqual(1);

    for (const m of airPairs) {
      const kickerCards = m.cards.slice(6); // remaining after 6 trio cards
      for (const k of kickerCards) {
        expect(k).not.toBe(5);
        expect(k).not.toBe(6);
      }
    }
  });

  it('Hand [8,8,8,8]: generates BOMB only, no FOUR_TWO variants', () => {
    const hand = createHand([8, 8, 8, 8]);
    const moves = generateLeadingMoves(hand);

    expect(hasMove(moves, HandType.BOMB, 7)).toBe(true); // bomb of 8s
    expect(findMovesByType(moves, HandType.FOUR_TWO_SINGLES)).toHaveLength(0);
    expect(findMovesByType(moves, HandType.FOUR_TWO_PAIRS)).toHaveLength(0);
  });

  it('Hand [8,8,8,8,3,5]: generates BOMB + FOUR_TWO_SINGLES with kickers NOT rank 8', () => {
    const hand = createHand([8, 8, 8, 8, 3, 5]);
    const moves = generateLeadingMoves(hand);

    expect(hasMove(moves, HandType.BOMB, 7)).toBe(true);

    const f2s = findMovesByType(moves, HandType.FOUR_TWO_SINGLES);
    expect(f2s).toHaveLength(1);
    // Kickers must not be value 8
    for (const m of f2s) {
      const kickers = m.cards.slice(4); // after the four 8s
      for (const k of kickers) {
        expect(k).not.toBe(8);
      }
    }
  });

  it('Hand [8,8,8,8,3,3,5,5]: generates BOMB + FOUR_TWO_PAIRS with pair kickers NOT rank 8', () => {
    const hand = createHand([8, 8, 8, 8, 3, 3, 5, 5]);
    const moves = generateLeadingMoves(hand);

    expect(hasMove(moves, HandType.BOMB, 7)).toBe(true);

    const f2p = findMovesByType(moves, HandType.FOUR_TWO_PAIRS);
    expect(f2p).toHaveLength(1);
    for (const m of f2p) {
      const kickers = m.cards.slice(4); // after the four 8s
      for (const k of kickers) {
        expect(k).not.toBe(8);
      }
    }
  });

  it('Hand [14,15]: generates ROCKET plus SINGLE(14) and SINGLE(15)', () => {
    const hand = createHand([14, 15]);
    const moves = generateLeadingMoves(hand);

    expect(hasMove(moves, HandType.ROCKET, 14)).toBe(true);
    expect(hasMove(moves, HandType.SINGLE, 13)).toBe(true); // small joker
    expect(hasMove(moves, HandType.SINGLE, 14)).toBe(true); // big joker
  });

  it('Hand [14,15,3]: generates ROCKET + 3 SINGLEs, no sequential types involving jokers', () => {
    const hand = createHand([14, 15, 3]);
    const moves = generateLeadingMoves(hand);

    expect(hasMove(moves, HandType.ROCKET, 14)).toBe(true);
    const singles = findMovesByType(moves, HandType.SINGLE);
    expect(singles).toHaveLength(3);

    expect(findMovesByType(moves, HandType.STRAIGHT)).toHaveLength(0);
    expect(findMovesByType(moves, HandType.CONSECUTIVE_PAIRS)).toHaveLength(0);
  });

  it('Empty hand: generates no moves', () => {
    const hand = createHand([]);
    const moves = generateLeadingMoves(hand);
    expect(moves).toHaveLength(0);
  });
});

describe('generateFollowingMoves', () => {
  // Helper to create a lastMove object
  function makeLastMove(type: HandType, mainRank: number, length: number, cards: number[]): Move {
    return { type, mainRank, length, cards };
  }

  it('Following a SINGLE(5): generates all SINGLEs with mainRank > 4 + PASS', () => {
    const hand = createHand([3, 7, 9]);
    const lastMove = makeLastMove(HandType.SINGLE, 4, 1, [5]); // value 5 = index 4
    const moves = generateFollowingMoves(hand, lastMove);

    // PASS is always present
    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    // Only SINGLEs with higher rank
    const singles = findMovesByType(moves, HandType.SINGLE);
    expect(singles).toHaveLength(2); // 7 (index 6) and 9 (index 8)
    expect(hasMove(moves, HandType.SINGLE, 6)).toBe(true);
    expect(hasMove(moves, HandType.SINGLE, 8)).toBe(true);

    // No pairs, triples, etc.
    expect(findMovesByType(moves, HandType.PAIR)).toHaveLength(0);
    expect(findMovesByType(moves, HandType.TRIPLE)).toHaveLength(0);
  });

  it('Following a PAIR(5): generates all PAIRs with mainRank > 4 + PASS', () => {
    const hand = createHand([3, 3, 7, 7, 9, 9]);
    const lastMove = makeLastMove(HandType.PAIR, 4, 2, [5, 5]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const pairs = findMovesByType(moves, HandType.PAIR);
    expect(pairs).toHaveLength(2); // pair of 7s and pair of 9s
    expect(hasMove(moves, HandType.PAIR, 6)).toBe(true);
    expect(hasMove(moves, HandType.PAIR, 8)).toBe(true);

    // No singles
    expect(findMovesByType(moves, HandType.SINGLE)).toHaveLength(0);
  });

  it('Following a TRIPLE(5): generates all TRIPLEs with mainRank > 4 + PASS', () => {
    const hand = createHand([7, 7, 7, 9, 9, 9]);
    const lastMove = makeLastMove(HandType.TRIPLE, 4, 3, [5, 5, 5]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const triples = findMovesByType(moves, HandType.TRIPLE);
    expect(triples).toHaveLength(2);
    expect(hasMove(moves, HandType.TRIPLE, 6)).toBe(true);
    expect(hasMove(moves, HandType.TRIPLE, 8)).toBe(true);
  });

  it('Following a TRIPLE_SINGLE(mainRank=4): generates higher TRIPLE_SINGLEs + PASS', () => {
    const hand = createHand([7, 7, 7, 3, 9, 9, 9, 5]);
    const lastMove = makeLastMove(HandType.TRIPLE_SINGLE, 4, 4, [5, 5, 5, 3]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const ts = findMovesByType(moves, HandType.TRIPLE_SINGLE);
    // Should have TRIPLE_SINGLE for rank 7 (index 6) with various kickers,
    // and rank 9 (index 8) with various kickers
    expect(ts.length).toBeGreaterThan(0);
    // All mainRanks should be > 4
    for (const m of ts) {
      expect(m.mainRank).toBeGreaterThan(4);
    }
  });

  it('Following a STRAIGHT(mainRank=2, length=5, cards 3-7): generates same-length higher STRAIGHTs + PASS + bomb overrides', () => {
    const hand = createHand([4, 5, 6, 7, 8, 9, 10]);
    const lastMove = makeLastMove(HandType.STRAIGHT, 2, 5, [3, 4, 5, 6, 7]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const straights = findMovesByType(moves, HandType.STRAIGHT);
    // Should have straights of length 5 with mainRank > 2
    for (const s of straights) {
      expect(s.length).toBe(5);
      expect(s.mainRank).toBeGreaterThan(2);
    }
  });

  it('Following a STRAIGHT(mainRank=2, length=5): does NOT generate straights of length 6', () => {
    const hand = createHand([4, 5, 6, 7, 8, 9, 10, 11]);
    const lastMove = makeLastMove(HandType.STRAIGHT, 2, 5, [3, 4, 5, 6, 7]);
    const moves = generateFollowingMoves(hand, lastMove);

    const straights = findMovesByType(moves, HandType.STRAIGHT);
    for (const s of straights) {
      expect(s.length).toBe(5); // strictly same length
    }
  });

  it('Following a CONSECUTIVE_PAIRS(mainRank=2, length=3): generates same-length higher + PASS', () => {
    const hand = createHand([5, 5, 6, 6, 7, 7, 8, 8]);
    const lastMove = makeLastMove(HandType.CONSECUTIVE_PAIRS, 2, 3, [3, 3, 4, 4, 5, 5]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const cps = findMovesByType(moves, HandType.CONSECUTIVE_PAIRS);
    for (const cp of cps) {
      expect(cp.length).toBe(3);
      expect(cp.mainRank).toBeGreaterThan(2);
    }
  });

  it('Following an AIRPLANE(mainRank=4, length=2): generates same-length higher AIRPLANEs + PASS', () => {
    const hand = createHand([7, 7, 7, 8, 8, 8, 9, 9, 9]);
    const lastMove = makeLastMove(HandType.AIRPLANE, 4, 2, [5, 5, 5, 6, 6, 6]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const airplanes = findMovesByType(moves, HandType.AIRPLANE);
    for (const a of airplanes) {
      expect(a.length).toBe(2);
      expect(a.mainRank).toBeGreaterThan(4);
    }
  });

  it('Following an AIRPLANE_SINGLES(mainRank=4, length=2): generates higher + PASS', () => {
    const hand = createHand([7, 7, 7, 8, 8, 8, 3, 9]);
    const lastMove = makeLastMove(HandType.AIRPLANE_SINGLES, 4, 2, [5, 5, 5, 6, 6, 6, 3, 4]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const airSingles = findMovesByType(moves, HandType.AIRPLANE_SINGLES);
    for (const a of airSingles) {
      expect(a.length).toBe(2);
      expect(a.mainRank).toBeGreaterThan(4);
    }
  });

  it('Following a BOMB(mainRank=7): generates higher BOMBs + ROCKET + PASS', () => {
    const hand = createHand([9, 9, 9, 9, 14, 15]); // bomb of 9s + both jokers
    const lastMove = makeLastMove(HandType.BOMB, 7, 4, [8, 8, 8, 8]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const bombs = findMovesByType(moves, HandType.BOMB);
    expect(bombs).toHaveLength(1);
    expect(bombs[0].mainRank).toBe(8); // bomb of 9s = index 8

    expect(hasMove(moves, HandType.ROCKET, 14)).toBe(true);

    // No non-bomb responses when following a bomb
    expect(findMovesByType(moves, HandType.SINGLE)).toHaveLength(0);
    expect(findMovesByType(moves, HandType.PAIR)).toHaveLength(0);
  });

  it('Following a ROCKET: generates only PASS', () => {
    const hand = createHand([3, 5, 7, 9]);
    const lastMove = makeLastMove(HandType.ROCKET, 14, 2, [14, 15]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves).toHaveLength(1);
    expect(moves[0].type).toBe(HandType.PASS);
  });

  it('Following any non-bomb move: BOMBs and ROCKET are available as overrides', () => {
    const hand = createHand([3, 5, 7, 7, 7, 7, 14, 15]); // bomb of 7s + rocket
    const lastMove = makeLastMove(HandType.SINGLE, 4, 1, [5]); // single 5
    const moves = generateFollowingMoves(hand, lastMove);

    expect(hasMove(moves, HandType.BOMB, 6)).toBe(true); // bomb of 7s
    expect(hasMove(moves, HandType.ROCKET, 14)).toBe(true);
  });

  it('PASS is always in the result for any following mode call', () => {
    const hand = createHand([3, 5]);
    const lastMove = makeLastMove(HandType.SINGLE, 12, 1, [13]); // single K
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);
  });

  it('When lastMove is BOMB and opponent has only higher bombs, those are generated', () => {
    const hand = createHand([11, 11, 11, 11]); // bomb of Js
    const lastMove = makeLastMove(HandType.BOMB, 7, 4, [8, 8, 8, 8]);
    const moves = generateFollowingMoves(hand, lastMove);

    const bombs = findMovesByType(moves, HandType.BOMB);
    expect(bombs).toHaveLength(1);
    expect(bombs[0].mainRank).toBe(10); // J = index 10
    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);
  });

  it('Following a FOUR_TWO_SINGLES: generates higher FOUR_TWO_SINGLES + PASS + bomb overrides', () => {
    const hand = createHand([9, 9, 9, 9, 3, 5]); // four 9s + 2 kickers
    const lastMove = makeLastMove(HandType.FOUR_TWO_SINGLES, 7, 6, [8, 8, 8, 8, 3, 5]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const f2s = findMovesByType(moves, HandType.FOUR_TWO_SINGLES);
    expect(f2s.length).toBeGreaterThanOrEqual(1);
    for (const m of f2s) {
      expect(m.mainRank).toBeGreaterThan(7);
    }
  });

  it('Following a FOUR_TWO_PAIRS: generates higher FOUR_TWO_PAIRS + PASS + bomb overrides', () => {
    const hand = createHand([9, 9, 9, 9, 3, 3, 5, 5]);
    const lastMove = makeLastMove(HandType.FOUR_TWO_PAIRS, 7, 8, [8, 8, 8, 8, 3, 3, 5, 5]);
    const moves = generateFollowingMoves(hand, lastMove);

    expect(moves.some(m => m.type === HandType.PASS)).toBe(true);

    const f2p = findMovesByType(moves, HandType.FOUR_TWO_PAIRS);
    expect(f2p.length).toBeGreaterThanOrEqual(1);
    for (const m of f2p) {
      expect(m.mainRank).toBeGreaterThan(7);
    }
  });
});
