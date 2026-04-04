import { HandType } from './types.js';
import type { Move } from './types.js';
import { CARD_COUNT, MIN_STRAIGHT_LENGTH, MIN_CONSECUTIVE_PAIRS_LENGTH, MIN_AIRPLANE_LENGTH } from './constants.js';
import { cardToIndex, indexToCard, SEQUENTIAL_INDICES } from './encoding.js';

export function classifyMove(cards: number[]): Move | null {
  if (cards.length === 0) return null;

  const counts = new Array(CARD_COUNT).fill(0);
  for (const card of cards) {
    counts[cardToIndex(card)]++;
  }

  const totalCards = cards.length;

  const rankCounts: { rank: number; count: number }[] = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    if (counts[i] > 0) {
      rankCounts.push({ rank: i, count: counts[i] });
    }
  }

  // ROCKET
  if (totalCards === 2 && counts[13] === 1 && counts[14] === 1) {
    return { type: HandType.ROCKET, mainRank: 14, length: 2, cards: [...cards].sort((a, b) => a - b) };
  }

  // BOMB
  if (totalCards === 4 && rankCounts.length === 1 && rankCounts[0].count === 4) {
    return { type: HandType.BOMB, mainRank: rankCounts[0].rank, length: 4, cards };
  }

  // FOUR_TWO_SINGLES
  if (totalCards === 6) {
    const fourRank = rankCounts.find(rc => rc.count === 4);
    if (fourRank) {
      const otherRanks = rankCounts.filter(rc => rc.rank !== fourRank.rank);
      let kickerCards = 0;
      for (const rc of otherRanks) {
        if (rc.rank === fourRank.rank) break;
        kickerCards += rc.count;
      }
      if (kickerCards === 2) {
        return { type: HandType.FOUR_TWO_SINGLES, mainRank: fourRank.rank, length: 6, cards };
      }
    }
  }

  // FOUR_TWO_PAIRS
  if (totalCards === 8) {
    const fourRank = rankCounts.find(rc => rc.count === 4);
    if (fourRank) {
      const otherRanks = rankCounts.filter(rc => rc.rank !== fourRank.rank);
      if (otherRanks.length === 2 && otherRanks.every(rc => rc.count === 2)) {
        return { type: HandType.FOUR_TWO_PAIRS, mainRank: fourRank.rank, length: 8, cards };
      }
    }
  }

  // Airplane variants
  for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
    if (counts[SEQUENTIAL_INDICES[si]] < 3) continue;
    let ei = si;
    while (ei + 1 < SEQUENTIAL_INDICES.length && counts[SEQUENTIAL_INDICES[ei + 1]] >= 3) {
      ei++;
    }
    const runLength = ei - si + 1;
    if (runLength >= MIN_AIRPLANE_LENGTH) {
      const trioStart = SEQUENTIAL_INDICES[si];
      const trioEnd = SEQUENTIAL_INDICES[ei];
      const trioCount = runLength;
      const trioRankSet = new Set<number>();
      for (let i = si; i <= ei; i++) {
        trioRankSet.add(SEQUENTIAL_INDICES[i]);
      }

      const remainingCounts = [...counts];
      for (const rank of trioRankSet) {
        remainingCounts[rank] -= 3;
      }
      const remainingTotal = remainingCounts.reduce((s, c) => s + c, 0);

      if (totalCards === 4 * trioCount && remainingTotal === trioCount) {
        let validSingles = true;
        for (const rank of trioRankSet) {
          if (remainingCounts[rank] > 0) { validSingles = false; break; }
        }
        if (validSingles) {
          return { type: HandType.AIRPLANE_SINGLES, mainRank: trioStart, length: trioCount, cards };
        }
      }

      if (totalCards === 5 * trioCount && remainingTotal === 2 * trioCount) {
        const remainingRanks: { rank: number; count: number }[] = [];
        for (let i = 0; i < CARD_COUNT; i++) {
          if (remainingCounts[i] > 0) {
            remainingRanks.push({ rank: i, count: remainingCounts[i] });
          }
        }
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

      if (totalCards === trioCount * 3) {
        return { type: HandType.AIRPLANE, mainRank: trioStart, length: trioCount, cards };
      }
    }
    si = ei;
  }

  // CONSECUTIVE_PAIRS
  for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
    if (counts[SEQUENTIAL_INDICES[si]] >= 2) {
      let ei = si;
      while (ei + 1 < SEQUENTIAL_INDICES.length && counts[SEQUENTIAL_INDICES[ei + 1]] >= 2) {
        ei++;
      }
      const runLength = ei - si + 1;
      if (runLength >= MIN_CONSECUTIVE_PAIRS_LENGTH && totalCards === 2 * runLength) {
        return {
          type: HandType.CONSECUTIVE_PAIRS,
          mainRank: SEQUENTIAL_INDICES[si],
          length: runLength,
          cards,
        };
      }
      si = ei;
    }
  }

  // STRAIGHT
  for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
    if (counts[SEQUENTIAL_INDICES[si]] >= 1) {
      let ei = si;
      while (ei + 1 < SEQUENTIAL_INDICES.length && counts[SEQUENTIAL_INDICES[ei + 1]] >= 1) {
        ei++;
      }
      const runLength = ei - si + 1;
      if (runLength >= MIN_STRAIGHT_LENGTH && totalCards === runLength) {
        return {
          type: HandType.STRAIGHT,
          mainRank: SEQUENTIAL_INDICES[si],
          length: runLength,
          cards,
        };
      }
      si = ei;
    }
  }

  // TRIPLE_PAIR
  if (totalCards === 5) {
    const tripleRank = rankCounts.find(rc => rc.count === 3);
    const pairRank = rankCounts.find(rc => rc.count === 2);
    if (tripleRank && pairRank && rankCounts.length === 2) {
      return { type: HandType.TRIPLE_PAIR, mainRank: tripleRank.rank, length: 5, cards };
    }
  }

  // TRIPLE_SINGLE
  if (totalCards === 4) {
    const tripleRank = rankCounts.find(rc => rc.count === 3);
    const singleRank = rankCounts.find(rc => rc.count === 1);
    if (tripleRank && singleRank && rankCounts.length === 2) {
      return { type: HandType.TRIPLE_SINGLE, mainRank: tripleRank.rank, length: 4, cards };
    }
  }

  // TRIPLE
  if (totalCards === 3 && rankCounts.length === 1 && rankCounts[0].count === 3) {
    return { type: HandType.TRIPLE, mainRank: rankCounts[0].rank, length: 3, cards };
  }

  // PAIR
  if (totalCards === 2 && rankCounts.length === 1 && rankCounts[0].count === 2) {
    return { type: HandType.PAIR, mainRank: rankCounts[0].rank, length: 2, cards };
  }

  // SINGLE
  if (totalCards === 1) {
    return { type: HandType.SINGLE, mainRank: rankCounts[0].rank, length: 1, cards };
  }

  return null;
}

export function canBeat(lastMove: Move, currentMove: Move): boolean {
  if (currentMove.type === HandType.ROCKET) return true;
  if (lastMove.type === HandType.ROCKET) return false;
  if (currentMove.type === HandType.BOMB && lastMove.type !== HandType.BOMB) return true;
  if (currentMove.type === HandType.BOMB && lastMove.type === HandType.BOMB) {
    return currentMove.mainRank > lastMove.mainRank;
  }
  if (currentMove.type === lastMove.type) {
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
  return false;
}
