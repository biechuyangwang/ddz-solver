import { HandType } from './types.js';
import type { Move } from './types.js';
import { CARD_COUNT, MIN_STRAIGHT_LENGTH, MIN_CONSECUTIVE_PAIRS_LENGTH, MIN_AIRPLANE_LENGTH } from './constants.js';

/**
 * Classify a set of cards into a DDZ hand type.
 * Returns a Move object with type, mainRank, length, and cards, or null if invalid.
 *
 * Card values: 1=A, 2-10, 11=J, 12=Q, 13=K, 14=Small Joker, 15=Big Joker
 * Indices in count array: 0=A, 1=2, ..., 12=K, 13=Small Joker, 14=Big Joker
 *
 * Key rule: Value 2 (index 1) and jokers (indices 13, 14) are excluded from
 * all sequential types (straight, consecutive pairs, airplane trios).
 */
export function classifyMove(cards: number[]): Move | null {
  if (cards.length === 0) return null;

  // Build count array
  const counts = new Array(CARD_COUNT).fill(0);
  for (const card of cards) {
    counts[card - 1]++;
  }

  const totalCards = cards.length;

  // Helper: get unique ranks with their counts
  const rankCounts: { rank: number; count: number }[] = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    if (counts[i] > 0) {
      rankCounts.push({ rank: i, count: counts[i] });
    }
  }

  // Detection order: ROCKET > BOMB > complex types > simple types

  // 1. ROCKET: exactly 2 cards, one of each joker
  if (totalCards === 2 && counts[13] === 1 && counts[14] === 1) {
    return { type: HandType.ROCKET, mainRank: 14, length: 2, cards: [...cards].sort((a, b) => a - b) };
  }

  // 2. BOMB: exactly 4 of the same rank
  if (totalCards === 4 && rankCounts.length === 1 && rankCounts[0].count === 4) {
    return { type: HandType.BOMB, mainRank: rankCounts[0].rank, length: 4, cards };
  }

  // 3. FOUR_TWO_SINGLES: 4 of one rank + exactly 2 other single cards (different rank from the four)
  if (totalCards === 6) {
    const fourRank = rankCounts.find(rc => rc.count === 4);
    if (fourRank) {
      const otherRanks = rankCounts.filter(rc => rc.rank !== fourRank.rank);
      // The 2 kickers must not be the same rank as the four
      // They can be the same rank as each other (2 singles of same value is ok if count allows)
      // Total kicker cards = 2, from ranks != fourRank.rank
      let kickerCards = 0;
      let validKick = true;
      for (const rc of otherRanks) {
        if (rc.rank === fourRank.rank) { validKick = false; break; }
        kickerCards += rc.count;
      }
      if (validKick && kickerCards === 2) {
        return { type: HandType.FOUR_TWO_SINGLES, mainRank: fourRank.rank, length: 6, cards };
      }
    }
  }

  // 4. FOUR_TWO_PAIRS: 4 of one rank + exactly 2 pairs (different ranks from the four)
  if (totalCards === 8) {
    const fourRank = rankCounts.find(rc => rc.count === 4);
    if (fourRank) {
      const otherRanks = rankCounts.filter(rc => rc.rank !== fourRank.rank);
      // Must be exactly 2 pairs
      if (otherRanks.length === 2 && otherRanks.every(rc => rc.count === 2)) {
        return { type: HandType.FOUR_TWO_PAIRS, mainRank: fourRank.rank, length: 8, cards };
      }
    }
  }

  // 5-7. Airplane variants (consecutive triples with/without wings)
  // Find consecutive triples in valid sequential range (indices 0-12, excluding index 1)
  // Valid sequential indices: [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] (skip index 1)
  const sequentialIndices = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Find all runs of consecutive indices where count >= 3
  const trioRuns: { start: number; end: number; length: number }[] = [];
  for (let si = 0; si < sequentialIndices.length; si++) {
    if (counts[sequentialIndices[si]] >= 3) {
      let endSi = si;
      while (endSi + 1 < sequentialIndices.length && counts[sequentialIndices[endSi + 1]] >= 3) {
        endSi++;
      }
      const runLength = endSi - si + 1;
      if (runLength >= MIN_AIRPLANE_LENGTH) {
        // Record all sub-runs of length >= 2? No -- record just this run.
        // But we need to try all valid sub-runs too if the full run doesn't match.
        // Actually, for classifyMove, the cards array uniquely determines the hand.
        // We need to find the longest run that explains the cards.
        trioRuns.push({
          start: sequentialIndices[si],
          end: sequentialIndices[endSi],
          length: runLength,
        });
      }
      si = endSi; // skip past this run
    }
  }

  // Try each trio run to see if it explains the cards
  for (const run of trioRuns) {
    // The trio cards
    const trioStart = run.start;
    const trioEnd = run.end;
    const trioCount = run.length;
    const trioCardCount = trioCount * 3;

    // Build the set of trio ranks
    const trioRankSet = new Set<number>();
    let trioSeqIdx = sequentialIndices.indexOf(trioStart);
    for (let i = 0; i < trioCount; i++) {
      trioRankSet.add(sequentialIndices[trioSeqIdx + i]);
    }

    // Remaining cards after removing trios
    const remainingCounts = [...counts];
    for (const rank of trioRankSet) {
      remainingCounts[rank] -= 3;
    }

    const remainingTotal = remainingCounts.reduce((s, c) => s + c, 0);

    // AIRPLANE_SINGLES: trioCount * 3 + trioCount singles = 4 * trioCount
    if (totalCards === 4 * trioCount && remainingTotal === trioCount) {
      // Verify remaining cards are all singles (count <= 1? No -- they can be from any rank)
      // Actually, we need exactly `trioCount` individual kicker cards.
      // The kickers must NOT be from trio ranks.
      let validSingles = true;
      for (const rank of trioRankSet) {
        if (remainingCounts[rank] > 0) { validSingles = false; break; }
      }
      if (validSingles) {
        return { type: HandType.AIRPLANE_SINGLES, mainRank: trioStart, length: trioCount, cards };
      }
    }

    // AIRPLANE_PAIRS: trioCount * 3 + trioCount * 2 = 5 * trioCount
    if (totalCards === 5 * trioCount && remainingTotal === 2 * trioCount) {
      // Verify remaining cards form exactly `trioCount` pairs
      // Each remaining rank must have count == 2, and no trio ranks
      const remainingRanks: { rank: number; count: number }[] = [];
      for (let i = 0; i < CARD_COUNT; i++) {
        if (remainingCounts[i] > 0) {
          remainingRanks.push({ rank: i, count: remainingCounts[i] });
        }
      }
      // Need exactly trioCount pairs
      let pairCount = 0;
      let validPairs = true;
      for (const rc of remainingRanks) {
        if (trioRankSet.has(rc.rank)) { validPairs = false; break; }
        if (rc.count % 2 !== 0) { validPairs = false; break; }
        pairCount += rc.count / 2;
      }
      if (validPairs && pairCount === trioCount) {
        return { type: HandType.AIRPLANE_PAIRS, mainRank: trioStart, length: trioCount, cards };
      }
    }

    // AIRPLANE (no wings): exactly trioCount * 3 cards
    if (totalCards === trioCardCount) {
      return { type: HandType.AIRPLANE, mainRank: trioStart, length: trioCount, cards };
    }
  }

  // 8. CONSECUTIVE_PAIRS: 3+ consecutive pairs, values in sequential indices only
  // Find the longest run of consecutive indices where count >= 2
  for (let si = 0; si < sequentialIndices.length; si++) {
    if (counts[sequentialIndices[si]] >= 2) {
      let endSi = si;
      while (endSi + 1 < sequentialIndices.length && counts[sequentialIndices[endSi + 1]] >= 2) {
        endSi++;
      }
      const runLength = endSi - si + 1;
      if (runLength >= MIN_CONSECUTIVE_PAIRS_LENGTH && totalCards === 2 * runLength) {
        // Verify all cards are accounted for (all counts in this range are exactly 2,
        // all counts outside this range are 0)
        // Actually, we just need the total cards to match: 2 * runLength == totalCards
        // and all indices in the run have count >= 2, and no other non-trio counts exist
        // Wait -- for consecutive pairs, ALL cards must be part of the pairs.
        // Check: for each index in run, count must be exactly 2 (not more).
        // Actually it could be more (e.g., 3 of a kind but we're only using 2 of them).
        // No -- classifyMove receives the exact cards played. If someone has 3 of a kind
        // but plays only 2 as part of consecutive pairs, the cards array has only 2.
        // So counts built from cards array should have exactly 2 for each pair rank.
        return {
          type: HandType.CONSECUTIVE_PAIRS,
          mainRank: sequentialIndices[si],
          length: runLength,
          cards,
        };
      }
      si = endSi;
    }
  }

  // 9. STRAIGHT: 5+ consecutive singles, sequential indices only
  for (let si = 0; si < sequentialIndices.length; si++) {
    if (counts[sequentialIndices[si]] >= 1) {
      let endSi = si;
      while (endSi + 1 < sequentialIndices.length && counts[sequentialIndices[endSi + 1]] >= 1) {
        endSi++;
      }
      const runLength = endSi - si + 1;
      if (runLength >= MIN_STRAIGHT_LENGTH && totalCards === runLength) {
        return {
          type: HandType.STRAIGHT,
          mainRank: sequentialIndices[si],
          length: runLength,
          cards,
        };
      }
      si = endSi;
    }
  }

  // 10. TRIPLE_PAIR: 3 of one rank + 2 of another rank. Total = 5.
  if (totalCards === 5) {
    const tripleRank = rankCounts.find(rc => rc.count === 3);
    const pairRank = rankCounts.find(rc => rc.count === 2);
    if (tripleRank && pairRank && rankCounts.length === 2) {
      return { type: HandType.TRIPLE_PAIR, mainRank: tripleRank.rank, length: 5, cards };
    }
  }

  // 11. TRIPLE_SINGLE: 3 of one rank + 1 of another rank. Total = 4.
  if (totalCards === 4) {
    const tripleRank = rankCounts.find(rc => rc.count === 3);
    const singleRank = rankCounts.find(rc => rc.count === 1);
    if (tripleRank && singleRank && rankCounts.length === 2) {
      return { type: HandType.TRIPLE_SINGLE, mainRank: tripleRank.rank, length: 4, cards };
    }
  }

  // 12. TRIPLE: 3 of one rank only. Total = 3.
  if (totalCards === 3 && rankCounts.length === 1 && rankCounts[0].count === 3) {
    return { type: HandType.TRIPLE, mainRank: rankCounts[0].rank, length: 3, cards };
  }

  // 13. PAIR: 2 of one rank only. Total = 2.
  if (totalCards === 2 && rankCounts.length === 1 && rankCounts[0].count === 2) {
    return { type: HandType.PAIR, mainRank: rankCounts[0].rank, length: 2, cards };
  }

  // 14. SINGLE: 1 card. Total = 1.
  if (totalCards === 1) {
    return { type: HandType.SINGLE, mainRank: rankCounts[0].rank, length: 1, cards };
  }

  return null;
}

/**
 * Determine if currentMove can beat lastMove according to DDZ rules.
 *
 * Hierarchy:
 * 1. ROCKET beats everything
 * 2. BOMB beats any non-bomb, non-rocket
 * 3. Same type: same length (for sequences), higher mainRank wins
 */
export function canBeat(lastMove: Move, currentMove: Move): boolean {
  // Rocket beats everything
  if (currentMove.type === HandType.ROCKET) return true;

  // Nothing beats a rocket (except another rocket, handled above)
  if (lastMove.type === HandType.ROCKET) return false;

  // Bomb beats non-bomb
  if (currentMove.type === HandType.BOMB && lastMove.type !== HandType.BOMB) {
    return true;
  }

  // Bomb vs bomb: higher rank wins
  if (currentMove.type === HandType.BOMB && lastMove.type === HandType.BOMB) {
    return currentMove.mainRank > lastMove.mainRank;
  }

  // Same type comparison
  if (currentMove.type === lastMove.type) {
    // For sequential types, length must match
    if (
      currentMove.type === HandType.STRAIGHT ||
      currentMove.type === HandType.CONSECUTIVE_PAIRS ||
      currentMove.type === HandType.AIRPLANE ||
      currentMove.type === HandType.AIRPLANE_SINGLES ||
      currentMove.type === HandType.AIRPLANE_PAIRS
    ) {
      if (currentMove.length !== lastMove.length) return false;
    }
    return currentMove.mainRank > lastMove.mainRank;
  }

  // Different types (and neither is bomb/rocket) -- cannot beat
  return false;
}
