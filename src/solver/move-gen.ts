import { HandType, PASS_MOVE } from './types.js';
import type { Hand, Move } from './types.js';
import {
  MIN_STRAIGHT_LENGTH,
  MIN_CONSECUTIVE_PAIRS_LENGTH,
  MIN_AIRPLANE_LENGTH,
} from './constants.js';
import { combinations } from './utils.js';

/**
 * Valid sequential indices for straights, consecutive pairs, and airplanes.
 * Skips index 1 (value 2) and indices 13-14 (jokers).
 * Values: [0(A), 2(3), 3(4), ..., 12(K)]
 */
const SEQUENTIAL_INDICES = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Generate all possible moves when leading (free play).
 * Enumerates every legal play from the hand across all 14 hand types.
 */
export function generateLeadingMoves(hand: Hand): Move[] {
  const moves: Move[] = [];

  // Singles: for each rank with at least 1 card
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 1) {
      moves.push({ type: HandType.SINGLE, mainRank: v, length: 1, cards: [v + 1] });
    }
  }

  // Pairs: for each rank with at least 2 cards
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 2) {
      moves.push({ type: HandType.PAIR, mainRank: v, length: 2, cards: [v + 1, v + 1] });
    }
  }

  // Triples, Triple+Single, Triple+Pair
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 3) {
      // TRIPLE
      moves.push({
        type: HandType.TRIPLE,
        mainRank: v,
        length: 3,
        cards: [v + 1, v + 1, v + 1],
      });

      // TRIPLE_SINGLE: any single kicker from a different rank
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 1) {
          moves.push({
            type: HandType.TRIPLE_SINGLE,
            mainRank: v,
            length: 4,
            cards: [v + 1, v + 1, v + 1, k + 1],
          });
        }
      }

      // TRIPLE_PAIR: any pair kicker from a different rank
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 2) {
          moves.push({
            type: HandType.TRIPLE_PAIR,
            mainRank: v,
            length: 5,
            cards: [v + 1, v + 1, v + 1, k + 1, k + 1],
          });
        }
      }
    }
  }

  // Straights: 5+ consecutive singles in valid sequential range
  for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
    let ei = si;
    while (ei < SEQUENTIAL_INDICES.length && hand[SEQUENTIAL_INDICES[ei]] >= 1) {
      ei++;
    }
    // ei is now past the last valid index; the run is si..ei-1
    const runLength = ei - si;
    if (runLength >= MIN_STRAIGHT_LENGTH) {
      // Generate all sub-sequences of length >= 5
      for (let start = si; start <= ei - MIN_STRAIGHT_LENGTH; start++) {
        for (let end = start + MIN_STRAIGHT_LENGTH - 1; end < ei; end++) {
          const len = end - start + 1;
          const cards: number[] = [];
          for (let i = start; i <= end; i++) {
            cards.push(SEQUENTIAL_INDICES[i] + 1);
          }
          moves.push({
            type: HandType.STRAIGHT,
            mainRank: SEQUENTIAL_INDICES[start],
            length: len,
            cards,
          });
        }
      }
    }
    // Skip past this run
    if (runLength > 0) si = ei - 1;
  }

  // Consecutive Pairs: 3+ consecutive pairs in valid sequential range
  for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
    let ei = si;
    while (ei < SEQUENTIAL_INDICES.length && hand[SEQUENTIAL_INDICES[ei]] >= 2) {
      ei++;
    }
    const runLength = ei - si;
    if (runLength >= MIN_CONSECUTIVE_PAIRS_LENGTH) {
      // Generate all sub-sequences of length >= 3
      for (let start = si; start <= ei - MIN_CONSECUTIVE_PAIRS_LENGTH; start++) {
        for (let end = start + MIN_CONSECUTIVE_PAIRS_LENGTH - 1; end < ei; end++) {
          const len = end - start + 1;
          const cards: number[] = [];
          for (let i = start; i <= end; i++) {
            cards.push(SEQUENTIAL_INDICES[i] + 1, SEQUENTIAL_INDICES[i] + 1);
          }
          moves.push({
            type: HandType.CONSECUTIVE_PAIRS,
            mainRank: SEQUENTIAL_INDICES[start],
            length: len,
            cards,
          });
        }
      }
    }
    if (runLength > 0) si = ei - 1;
  }

  // Airplanes: 2+ consecutive triples in valid sequential range
  for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
    if (hand[SEQUENTIAL_INDICES[si]] < 3) continue;
    let ei = si;
    while (ei + 1 < SEQUENTIAL_INDICES.length && hand[SEQUENTIAL_INDICES[ei + 1]] >= 3) {
      ei++;
    }
    const runLength = ei - si + 1;
    if (runLength >= MIN_AIRPLANE_LENGTH) {
      // Generate all sub-sequences of length >= 2
      for (let start = si; start <= ei - MIN_AIRPLANE_LENGTH + 1; start++) {
        for (let end = start + MIN_AIRPLANE_LENGTH - 1; end <= ei; end++) {
          const trioCount = end - start + 1;

          // Build trio cards and rank set
          const trioCards: number[] = [];
          const trioRankSet = new Set<number>();
          for (let i = start; i <= end; i++) {
            const rank = SEQUENTIAL_INDICES[i];
            trioCards.push(rank + 1, rank + 1, rank + 1);
            trioRankSet.add(rank);
          }

          // AIRPLANE (no wings)
          moves.push({
            type: HandType.AIRPLANE,
            mainRank: SEQUENTIAL_INDICES[start],
            length: trioCount,
            cards: [...trioCards],
          });

          // AIRPLANE_SINGLES: trioCount single kickers from non-trio ranks
          const singleKickers: number[] = [];
          for (let k = 0; k < 15; k++) {
            if (!trioRankSet.has(k) && hand[k] >= 1) {
              singleKickers.push(k);
            }
          }
          if (singleKickers.length >= trioCount) {
            for (const combo of combinations(singleKickers, trioCount)) {
              const cards = [...trioCards, ...combo.map((k: number) => k + 1)];
              moves.push({
                type: HandType.AIRPLANE_SINGLES,
                mainRank: SEQUENTIAL_INDICES[start],
                length: trioCount,
                cards,
              });
            }
          }

          // AIRPLANE_PAIRS: trioCount pair kickers from non-trio ranks
          const pairKickers: number[] = [];
          for (let k = 0; k < 15; k++) {
            if (!trioRankSet.has(k) && hand[k] >= 2) {
              pairKickers.push(k);
            }
          }
          if (pairKickers.length >= trioCount) {
            for (const combo of combinations(pairKickers, trioCount)) {
              const cards = [...trioCards, ...combo.flatMap((k: number) => [k + 1, k + 1])];
              moves.push({
                type: HandType.AIRPLANE_PAIRS,
                mainRank: SEQUENTIAL_INDICES[start],
                length: trioCount,
                cards,
              });
            }
          }
        }
      }
    }
    // Skip past this run
    si = ei;
  }

  // Four+Two and Bombs
  for (let v = 0; v < 15; v++) {
    if (hand[v] === 4) {
      // BOMB
      moves.push({
        type: HandType.BOMB,
        mainRank: v,
        length: 4,
        cards: [v + 1, v + 1, v + 1, v + 1],
      });

      // FOUR_TWO_SINGLES: 2 single kickers from non-four ranks
      const singles: number[] = [];
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 1) {
          singles.push(k);
        }
      }
      if (singles.length >= 2) {
        for (const combo of combinations(singles, 2)) {
          const [a, b] = combo as [number, number];
          moves.push({
            type: HandType.FOUR_TWO_SINGLES,
            mainRank: v,
            length: 6,
            cards: [v + 1, v + 1, v + 1, v + 1, a + 1, b + 1],
          });
        }
      }

      // FOUR_TWO_PAIRS: 2 pair kickers from non-four ranks
      const pairs: number[] = [];
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 2) {
          pairs.push(k);
        }
      }
      if (pairs.length >= 2) {
        for (const combo of combinations(pairs, 2)) {
          const [a, b] = combo as [number, number];
          moves.push({
            type: HandType.FOUR_TWO_PAIRS,
            mainRank: v,
            length: 8,
            cards: [v + 1, v + 1, v + 1, v + 1, a + 1, a + 1, b + 1, b + 1],
          });
        }
      }
    }
  }

  // Rocket: both jokers
  if (hand[13] >= 1 && hand[14] >= 1) {
    moves.push({ type: HandType.ROCKET, mainRank: 14, length: 2, cards: [14, 15] });
  }

  return moves;
}

/**
 * Generate all possible moves when following (must beat lastMove or PASS).
 * Returns PASS plus all plays that can beat the last move.
 * Bombs and rockets can override any non-bomb move.
 */
export function generateFollowingMoves(hand: Hand, lastMove: Move): Move[] {
  const moves: Move[] = [];

  // PASS is always available when following (SOLV-06)
  moves.push(PASS_MOVE);

  switch (lastMove.type) {
    case HandType.SINGLE:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 1) {
          moves.push({ type: HandType.SINGLE, mainRank: v, length: 1, cards: [v + 1] });
        }
      }
      break;

    case HandType.PAIR:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 2) {
          moves.push({ type: HandType.PAIR, mainRank: v, length: 2, cards: [v + 1, v + 1] });
        }
      }
      break;

    case HandType.TRIPLE:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) {
          moves.push({
            type: HandType.TRIPLE,
            mainRank: v,
            length: 3,
            cards: [v + 1, v + 1, v + 1],
          });
        }
      }
      break;

    case HandType.TRIPLE_SINGLE:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) {
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 1) {
              moves.push({
                type: HandType.TRIPLE_SINGLE,
                mainRank: v,
                length: 4,
                cards: [v + 1, v + 1, v + 1, k + 1],
              });
            }
          }
        }
      }
      break;

    case HandType.TRIPLE_PAIR:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) {
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 2) {
              moves.push({
                type: HandType.TRIPLE_PAIR,
                mainRank: v,
                length: 5,
                cards: [v + 1, v + 1, v + 1, k + 1, k + 1],
              });
            }
          }
        }
      }
      break;

    case HandType.STRAIGHT:
      // Must match length exactly
      for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
        const startRank = SEQUENTIAL_INDICES[si];
        if (startRank <= lastMove.mainRank) continue;
        // Check if we have enough consecutive cards starting from startRank
        const endSi = si + lastMove.length - 1;
        if (endSi >= SEQUENTIAL_INDICES.length) continue;
        let valid = true;
        const cards: number[] = [];
        for (let i = si; i <= endSi; i++) {
          if (hand[SEQUENTIAL_INDICES[i]] < 1) {
            valid = false;
            break;
          }
          cards.push(SEQUENTIAL_INDICES[i] + 1);
        }
        if (valid) {
          moves.push({
            type: HandType.STRAIGHT,
            mainRank: startRank,
            length: lastMove.length,
            cards,
          });
        }
      }
      break;

    case HandType.CONSECUTIVE_PAIRS:
      // Same length, higher mainRank
      for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
        const startRank = SEQUENTIAL_INDICES[si];
        if (startRank <= lastMove.mainRank) continue;
        const endSi = si + lastMove.length - 1;
        if (endSi >= SEQUENTIAL_INDICES.length) continue;
        let valid = true;
        const cards: number[] = [];
        for (let i = si; i <= endSi; i++) {
          if (hand[SEQUENTIAL_INDICES[i]] < 2) {
            valid = false;
            break;
          }
          cards.push(SEQUENTIAL_INDICES[i] + 1, SEQUENTIAL_INDICES[i] + 1);
        }
        if (valid) {
          moves.push({
            type: HandType.CONSECUTIVE_PAIRS,
            mainRank: startRank,
            length: lastMove.length,
            cards,
          });
        }
      }
      break;

    case HandType.AIRPLANE:
      // Same length consecutive triples, higher mainRank
      for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
        const startRank = SEQUENTIAL_INDICES[si];
        if (startRank <= lastMove.mainRank) continue;
        const endSi = si + lastMove.length - 1;
        if (endSi >= SEQUENTIAL_INDICES.length) continue;
        let valid = true;
        const cards: number[] = [];
        for (let i = si; i <= endSi; i++) {
          if (hand[SEQUENTIAL_INDICES[i]] < 3) {
            valid = false;
            break;
          }
          cards.push(SEQUENTIAL_INDICES[i] + 1, SEQUENTIAL_INDICES[i] + 1, SEQUENTIAL_INDICES[i] + 1);
        }
        if (valid) {
          moves.push({
            type: HandType.AIRPLANE,
            mainRank: startRank,
            length: lastMove.length,
            cards,
          });
        }
      }
      break;

    case HandType.AIRPLANE_SINGLES:
      // Same length airplane+singles, higher mainRank, with kicker combinations
      for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
        const startRank = SEQUENTIAL_INDICES[si];
        if (startRank <= lastMove.mainRank) continue;
        const endSi = si + lastMove.length - 1;
        if (endSi >= SEQUENTIAL_INDICES.length) continue;
        let valid = true;
        const trioCards: number[] = [];
        const trioRankSet = new Set<number>();
        for (let i = si; i <= endSi; i++) {
          if (hand[SEQUENTIAL_INDICES[i]] < 3) {
            valid = false;
            break;
          }
          trioCards.push(SEQUENTIAL_INDICES[i] + 1, SEQUENTIAL_INDICES[i] + 1, SEQUENTIAL_INDICES[i] + 1);
          trioRankSet.add(SEQUENTIAL_INDICES[i]);
        }
        if (!valid) continue;

        const trioCount = lastMove.length;
        const singleKickers: number[] = [];
        for (let k = 0; k < 15; k++) {
          if (!trioRankSet.has(k) && hand[k] >= 1) {
            singleKickers.push(k);
          }
        }
        if (singleKickers.length >= trioCount) {
          for (const combo of combinations(singleKickers, trioCount)) {
            const cards = [...trioCards, ...combo.map((k: number) => k + 1)];
            moves.push({
              type: HandType.AIRPLANE_SINGLES,
              mainRank: startRank,
              length: trioCount,
              cards,
            });
          }
        }
      }
      break;

    case HandType.AIRPLANE_PAIRS:
      // Same length airplane+pairs, higher mainRank, with pair kicker combinations
      for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
        const startRank = SEQUENTIAL_INDICES[si];
        if (startRank <= lastMove.mainRank) continue;
        const endSi = si + lastMove.length - 1;
        if (endSi >= SEQUENTIAL_INDICES.length) continue;
        let valid = true;
        const trioCards: number[] = [];
        const trioRankSet = new Set<number>();
        for (let i = si; i <= endSi; i++) {
          if (hand[SEQUENTIAL_INDICES[i]] < 3) {
            valid = false;
            break;
          }
          trioCards.push(SEQUENTIAL_INDICES[i] + 1, SEQUENTIAL_INDICES[i] + 1, SEQUENTIAL_INDICES[i] + 1);
          trioRankSet.add(SEQUENTIAL_INDICES[i]);
        }
        if (!valid) continue;

        const trioCount = lastMove.length;
        const pairKickers: number[] = [];
        for (let k = 0; k < 15; k++) {
          if (!trioRankSet.has(k) && hand[k] >= 2) {
            pairKickers.push(k);
          }
        }
        if (pairKickers.length >= trioCount) {
          for (const combo of combinations(pairKickers, trioCount)) {
            const cards = [...trioCards, ...combo.flatMap((k: number) => [k + 1, k + 1])];
            moves.push({
              type: HandType.AIRPLANE_PAIRS,
              mainRank: startRank,
              length: trioCount,
              cards,
            });
          }
        }
      }
      break;

    case HandType.FOUR_TWO_SINGLES:
      // Higher four-of-a-kind with 2 single kickers
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] === 4) {
          const singles: number[] = [];
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 1) {
              singles.push(k);
            }
          }
          if (singles.length >= 2) {
            for (const combo of combinations(singles, 2)) {
              const [a, b] = combo as [number, number];
              moves.push({
                type: HandType.FOUR_TWO_SINGLES,
                mainRank: v,
                length: 6,
                cards: [v + 1, v + 1, v + 1, v + 1, a + 1, b + 1],
              });
            }
          }
        }
      }
      break;

    case HandType.FOUR_TWO_PAIRS:
      // Higher four-of-a-kind with 2 pair kickers
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] === 4) {
          const pairs: number[] = [];
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 2) {
              pairs.push(k);
            }
          }
          if (pairs.length >= 2) {
            for (const combo of combinations(pairs, 2)) {
              const [a, b] = combo as [number, number];
              moves.push({
                type: HandType.FOUR_TWO_PAIRS,
                mainRank: v,
                length: 8,
                cards: [v + 1, v + 1, v + 1, v + 1, a + 1, a + 1, b + 1, b + 1],
              });
            }
          }
        }
      }
      break;

    case HandType.BOMB:
      // Must play a higher bomb
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] === 4) {
          moves.push({
            type: HandType.BOMB,
            mainRank: v,
            length: 4,
            cards: [v + 1, v + 1, v + 1, v + 1],
          });
        }
      }
      // Rocket always beats bomb
      if (hand[13] >= 1 && hand[14] >= 1) {
        moves.push({ type: HandType.ROCKET, mainRank: 14, length: 2, cards: [14, 15] });
      }
      return moves; // Don't add generic bomb overrides below

    case HandType.ROCKET:
      // Nothing beats a rocket, only PASS
      return moves;

    case HandType.PASS:
      // If last move is PASS, this shouldn't happen in normal flow,
      // but treat as leading mode by falling through to bomb/rocket overrides
      break;
  }

  // For non-bomb, non-rocket last moves: bombs and rockets can always be played as overrides
  // BOMB and ROCKET cases return early above, so we only reach here for other types
  const nonBombRocketTypes: HandType[] = [
    HandType.SINGLE, HandType.PAIR, HandType.TRIPLE,
    HandType.TRIPLE_SINGLE, HandType.TRIPLE_PAIR,
    HandType.STRAIGHT, HandType.CONSECUTIVE_PAIRS,
    HandType.AIRPLANE, HandType.AIRPLANE_SINGLES, HandType.AIRPLANE_PAIRS,
    HandType.FOUR_TWO_SINGLES, HandType.FOUR_TWO_PAIRS, HandType.PASS,
  ];
  if (nonBombRocketTypes.includes(lastMove.type)) {
    for (let v = 0; v < 15; v++) {
      if (hand[v] === 4) {
        moves.push({
          type: HandType.BOMB,
          mainRank: v,
          length: 4,
          cards: [v + 1, v + 1, v + 1, v + 1],
        });
      }
    }
    if (hand[13] >= 1 && hand[14] >= 1) {
      moves.push({ type: HandType.ROCKET, mainRank: 14, length: 2, cards: [14, 15] });
    }
  }

  return moves;
}
