import { HandType, PASS_MOVE } from './types.js';
import type { Hand, Move } from './types.js';
import {
  MIN_STRAIGHT_LENGTH,
  MIN_CONSECUTIVE_PAIRS_LENGTH,
  MIN_AIRPLANE_LENGTH,
} from './constants.js';
import { indexToCard, SEQUENTIAL_INDICES } from './encoding.js';
import { combinations } from './utils.js';

/**
 * Generate all possible moves when leading (free play).
 * Enumerates every legal play from the hand across all 14 hand types.
 */
export function generateLeadingMoves(hand: Hand): Move[] {
  const moves: Move[] = [];

  // Singles: for each rank with at least 1 card
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 1) {
      moves.push({ type: HandType.SINGLE, mainRank: v, length: 1, cards: [indexToCard(v)] });
    }
  }

  // Pairs: for each rank with at least 2 cards
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 2) {
      const cv = indexToCard(v);
      moves.push({ type: HandType.PAIR, mainRank: v, length: 2, cards: [cv, cv] });
    }
  }

  // Triples, Triple+Single, Triple+Pair
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 3) {
      const cv = indexToCard(v);

      // TRIPLE
      moves.push({
        type: HandType.TRIPLE,
        mainRank: v,
        length: 3,
        cards: [cv, cv, cv],
      });

      // TRIPLE_SINGLE: any single kicker from a different rank
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 1) {
          moves.push({
            type: HandType.TRIPLE_SINGLE,
            mainRank: v,
            length: 4,
            cards: [cv, cv, cv, indexToCard(k)],
          });
        }
      }

      // TRIPLE_PAIR: any pair kicker from a different rank
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 2) {
          const kc = indexToCard(k);
          moves.push({
            type: HandType.TRIPLE_PAIR,
            mainRank: v,
            length: 5,
            cards: [cv, cv, cv, kc, kc],
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
    const runLength = ei - si;
    if (runLength >= MIN_STRAIGHT_LENGTH) {
      for (let start = si; start <= ei - MIN_STRAIGHT_LENGTH; start++) {
        for (let end = start + MIN_STRAIGHT_LENGTH - 1; end < ei; end++) {
          const len = end - start + 1;
          const cards: number[] = [];
          for (let i = start; i <= end; i++) {
            cards.push(indexToCard(SEQUENTIAL_INDICES[i]));
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
      for (let start = si; start <= ei - MIN_CONSECUTIVE_PAIRS_LENGTH; start++) {
        for (let end = start + MIN_CONSECUTIVE_PAIRS_LENGTH - 1; end < ei; end++) {
          const len = end - start + 1;
          const cards: number[] = [];
          for (let i = start; i <= end; i++) {
            const cv = indexToCard(SEQUENTIAL_INDICES[i]);
            cards.push(cv, cv);
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
      for (let start = si; start <= ei - MIN_AIRPLANE_LENGTH + 1; start++) {
        for (let end = start + MIN_AIRPLANE_LENGTH - 1; end <= ei; end++) {
          const trioCount = end - start + 1;
          const trioCards: number[] = [];
          const trioRankSet = new Set<number>();
          for (let i = start; i <= end; i++) {
            const cv = indexToCard(SEQUENTIAL_INDICES[i]);
            trioCards.push(cv, cv, cv);
            trioRankSet.add(SEQUENTIAL_INDICES[i]);
          }

          // AIRPLANE (no wings)
          moves.push({
            type: HandType.AIRPLANE,
            mainRank: SEQUENTIAL_INDICES[start],
            length: trioCount,
            cards: [...trioCards],
          });

          // AIRPLANE_SINGLES
          const singleKickers: number[] = [];
          for (let k = 0; k < 15; k++) {
            if (!trioRankSet.has(k) && hand[k] >= 1) {
              singleKickers.push(k);
            }
          }
          if (singleKickers.length >= trioCount) {
            for (const combo of combinations(singleKickers, trioCount)) {
              const cards = [...trioCards, ...combo.map((k: number) => indexToCard(k))];
              moves.push({
                type: HandType.AIRPLANE_SINGLES,
                mainRank: SEQUENTIAL_INDICES[start],
                length: trioCount,
                cards,
              });
            }
          }

          // AIRPLANE_PAIRS
          const pairKickers: number[] = [];
          for (let k = 0; k < 15; k++) {
            if (!trioRankSet.has(k) && hand[k] >= 2) {
              pairKickers.push(k);
            }
          }
          if (pairKickers.length >= trioCount) {
            for (const combo of combinations(pairKickers, trioCount)) {
              const cards = [...trioCards, ...combo.flatMap((k: number) => {
                const cv = indexToCard(k);
                return [cv, cv];
              })];
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
    si = ei;
  }

  // Four+Two and Bombs
  for (let v = 0; v < 15; v++) {
    if (hand[v] === 4) {
      const cv = indexToCard(v);

      // BOMB
      moves.push({
        type: HandType.BOMB,
        mainRank: v,
        length: 4,
        cards: [cv, cv, cv, cv],
      });

      // FOUR_TWO_SINGLES
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
            cards: [cv, cv, cv, cv, indexToCard(a), indexToCard(b)],
          });
        }
      }

      // FOUR_TWO_PAIRS
      const pairs: number[] = [];
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 2) {
          pairs.push(k);
        }
      }
      if (pairs.length >= 2) {
        for (const combo of combinations(pairs, 2)) {
          const [a, b] = combo as [number, number];
          const ac = indexToCard(a);
          const bc = indexToCard(b);
          moves.push({
            type: HandType.FOUR_TWO_PAIRS,
            mainRank: v,
            length: 8,
            cards: [cv, cv, cv, cv, ac, ac, bc, bc],
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
 */
export function generateFollowingMoves(hand: Hand, lastMove: Move): Move[] {
  const moves: Move[] = [];

  // PASS is always available when following
  moves.push(PASS_MOVE);

  switch (lastMove.type) {
    case HandType.SINGLE:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 1) {
          moves.push({ type: HandType.SINGLE, mainRank: v, length: 1, cards: [indexToCard(v)] });
        }
      }
      break;

    case HandType.PAIR:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 2) {
          const cv = indexToCard(v);
          moves.push({ type: HandType.PAIR, mainRank: v, length: 2, cards: [cv, cv] });
        }
      }
      break;

    case HandType.TRIPLE:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) {
          const cv = indexToCard(v);
          moves.push({ type: HandType.TRIPLE, mainRank: v, length: 3, cards: [cv, cv, cv] });
        }
      }
      break;

    case HandType.TRIPLE_SINGLE:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) {
          const cv = indexToCard(v);
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 1) {
              moves.push({
                type: HandType.TRIPLE_SINGLE,
                mainRank: v,
                length: 4,
                cards: [cv, cv, cv, indexToCard(k)],
              });
            }
          }
        }
      }
      break;

    case HandType.TRIPLE_PAIR:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) {
          const cv = indexToCard(v);
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 2) {
              const kc = indexToCard(k);
              moves.push({
                type: HandType.TRIPLE_PAIR,
                mainRank: v,
                length: 5,
                cards: [cv, cv, cv, kc, kc],
              });
            }
          }
        }
      }
      break;

    case HandType.STRAIGHT:
      for (let si = 0; si < SEQUENTIAL_INDICES.length; si++) {
        const startRank = SEQUENTIAL_INDICES[si];
        if (startRank <= lastMove.mainRank) continue;
        const endSi = si + lastMove.length - 1;
        if (endSi >= SEQUENTIAL_INDICES.length) continue;
        let valid = true;
        const cards: number[] = [];
        for (let i = si; i <= endSi; i++) {
          if (hand[SEQUENTIAL_INDICES[i]] < 1) {
            valid = false;
            break;
          }
          cards.push(indexToCard(SEQUENTIAL_INDICES[i]));
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
          const cv = indexToCard(SEQUENTIAL_INDICES[i]);
          cards.push(cv, cv);
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
          const cv = indexToCard(SEQUENTIAL_INDICES[i]);
          cards.push(cv, cv, cv);
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
          const cv = indexToCard(SEQUENTIAL_INDICES[i]);
          trioCards.push(cv, cv, cv);
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
            const cards = [...trioCards, ...combo.map((k: number) => indexToCard(k))];
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
          const cv = indexToCard(SEQUENTIAL_INDICES[i]);
          trioCards.push(cv, cv, cv);
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
            const cards = [...trioCards, ...combo.flatMap((k: number) => {
              const cv = indexToCard(k);
              return [cv, cv];
            })];
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
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] === 4) {
          const cv = indexToCard(v);
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
                cards: [cv, cv, cv, cv, indexToCard(a), indexToCard(b)],
              });
            }
          }
        }
      }
      break;

    case HandType.FOUR_TWO_PAIRS:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] === 4) {
          const cv = indexToCard(v);
          const pairs: number[] = [];
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 2) {
              pairs.push(k);
            }
          }
          if (pairs.length >= 2) {
            for (const combo of combinations(pairs, 2)) {
              const [a, b] = combo as [number, number];
              const ac = indexToCard(a);
              const bc = indexToCard(b);
              moves.push({
                type: HandType.FOUR_TWO_PAIRS,
                mainRank: v,
                length: 8,
                cards: [cv, cv, cv, cv, ac, ac, bc, bc],
              });
            }
          }
        }
      }
      break;

    case HandType.BOMB:
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] === 4) {
          const cv = indexToCard(v);
          moves.push({ type: HandType.BOMB, mainRank: v, length: 4, cards: [cv, cv, cv, cv] });
        }
      }
      if (hand[13] >= 1 && hand[14] >= 1) {
        moves.push({ type: HandType.ROCKET, mainRank: 14, length: 2, cards: [14, 15] });
      }
      return moves;

    case HandType.ROCKET:
      return moves;

    case HandType.PASS:
      break;
  }

  // For non-bomb, non-rocket last moves: bombs and rockets can always be played
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
        const cv = indexToCard(v);
        moves.push({ type: HandType.BOMB, mainRank: v, length: 4, cards: [cv, cv, cv, cv] });
      }
    }
    if (hand[13] >= 1 && hand[14] >= 1) {
      moves.push({ type: HandType.ROCKET, mainRank: 14, length: 2, cards: [14, 15] });
    }
  }

  return moves;
}
