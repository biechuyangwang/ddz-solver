import { HandType } from './types.js';
import type { Hand, Move } from './types.js';
import { handIsEmpty, applyMove, handSize } from './encoding.js';
import { generateLeadingMoves, generateFollowingMoves } from './move-gen.js';
import { TranspositionTable } from './transposition.js';
import { TreeBuilder } from './tree.js';

/**
 * Value-only negamax with alpha-beta pruning and transposition table.
 * No tree building. Used for on-demand expansion.
 *
 * Optimizations:
 *   [Opt 1] Instant win: detects hand-emptying moves before full search
 *   [Opt 2] Early win return: stops as soon as val=1 is found
 *   [Opt 3] Alpha-beta pruning: most effective with null window (0,1)
 *   [Opt 4] Move ordering: more cards first → higher rank → PASS last
 *
 * Returns a value from the perspective of the current player:
 *   1 = current player wins
 *  -1 = current player loses
 */
export function negamaxValue(
  myHand: Hand,
  opponentHand: Hand,
  lastMove: Move | null,
  passCount: number,
  nodeCounter: { count: number },
  tt: TranspositionTable,
  alpha: number = -Infinity,
  beta: number = Infinity,
): number {
  if (handIsEmpty(myHand)) return 1;
  if (handIsEmpty(opponentHand)) return -1;

  nodeCounter.count++;

  const hash = tt.computeStateHash(myHand, opponentHand, lastMove, passCount);
  const cached = tt.get(hash);
  if (cached !== undefined) return cached;

  const moves: Move[] =
    lastMove === null || passCount >= 1
      ? generateLeadingMoves(myHand)
      : generateFollowingMoves(myHand, lastMove);

  // [Opt 1] Instant win: any move that empties the entire hand is an immediate win
  const mySize = handSize(myHand);
  for (const move of moves) {
    if (move.type !== HandType.PASS && move.cards.length === mySize) {
      tt.set(hash, 1);
      return 1;
    }
  }

  // [Opt 4] Move ordering: more cards first → higher rank → PASS last
  moves.sort((a, b) => {
    if (a.type === HandType.PASS) return 1;
    if (b.type === HandType.PASS) return -1;
    const cardDiff = b.cards.length - a.cards.length;
    if (cardDiff !== 0) return cardDiff;
    return b.mainRank - a.mainRank;
  });

  let best = -Infinity;

  for (const move of moves) {
    const newMyHand = applyMove(myHand, move);
    let newLastMove: Move | null;
    let newPassCount: number;

    if (move.type === HandType.PASS) {
      newLastMove = lastMove;
      newPassCount = passCount + 1;
    } else {
      newLastMove = move;
      newPassCount = 0;
    }

    const val = -negamaxValue(opponentHand, newMyHand, newLastMove, newPassCount, nodeCounter, tt, -beta, -alpha);

    best = Math.max(best, val);

    // [Opt 2] Early win: found a winning move, stop searching siblings
    if (val === 1) {
      tt.set(hash, 1);
      return 1;
    }

    alpha = Math.max(alpha, val);

    // [Opt 3] Alpha-beta pruning
    if (alpha >= beta) {
      break;
    }
  }

  tt.set(hash, best);
  return best;
}

/**
 * Exhaustive negamax search — explores ALL moves at every level (no alpha-beta pruning).
 * Uses transposition table for state deduplication to avoid redundant computation.
 * Builds a complete decision tree showing every possible move.
 *
 * Returns a value from the perspective of the current player:
 *   1 = current player wins
 *  -1 = current player loses
 */
export function negamaxExhaustive(
  myHand: Hand,
  opponentHand: Hand,
  lastMove: Move | null,
  passCount: number,
  tree: TreeBuilder,
  isPlayerMove: boolean,
  nodeCounter: { count: number },
  tt: TranspositionTable,
): number {
  if (handIsEmpty(myHand)) return 1;
  if (handIsEmpty(opponentHand)) return -1;

  nodeCounter.count++;

  const hash = tt.computeStateHash(myHand, opponentHand, lastMove, passCount);
  const cached = tt.get(hash);
  if (cached !== undefined) return cached;

  const moves: Move[] =
    lastMove === null || passCount >= 1
      ? generateLeadingMoves(myHand)
      : generateFollowingMoves(myHand, lastMove);

  let best = -Infinity;

  for (const move of moves) {
    const newMyHand = applyMove(myHand, move);
    let newLastMove: Move | null;
    let newPassCount: number;

    if (move.type === HandType.PASS) {
      newLastMove = lastMove;
      newPassCount = passCount + 1;
    } else {
      newLastMove = move;
      newPassCount = 0;
    }

    tree.pushChild(move, isPlayerMove);
    const val = -negamaxExhaustive(opponentHand, newMyHand, newLastMove, newPassCount, tree, !isPlayerMove, nodeCounter, tt);
    tree.popChild(val);
    best = Math.max(best, val);
  }

  tt.set(hash, best);
  return best;
}

/**
 * Negamax search with alpha-beta pruning.
 *
 * Returns a value from the perspective of the current player:
 *   1 = current player wins
 *  -1 = current player loses
 *   0 = unknown (timed out)
 *
 * @param myHand          Current player's hand (count encoding)
 * @param opponentHand    Opponent's hand (count encoding)
 * @param lastMove        The move to beat, or null for free lead
 * @param passCount       Consecutive pass count (0, 1, or 2)
 * @param alpha           Alpha bound for pruning
 * @param beta            Beta bound for pruning
 * @param deadline        performance.now() deadline for time budget
 * @param tt              Transposition table for state deduplication
 * @param tree            TreeBuilder for decision tree construction (null to skip)
 * @param isPlayerMove    Whether the current move is by the first player
 * @param nodeCounter     Mutable counter for tracking explored nodes
 */
export function negamax(
  myHand: Hand,
  opponentHand: Hand,
  lastMove: Move | null,
  passCount: number,
  alpha: number,
  beta: number,
  deadline: number,
  tt: TranspositionTable,
  tree: TreeBuilder | null,
  isPlayerMove: boolean,
  nodeCounter: { count: number },
): number {
  // Terminal state: current player has no cards -> current player won
  if (handIsEmpty(myHand)) {
    return 1;
  }

  // Terminal state: opponent has no cards -> opponent won (current player lost)
  if (handIsEmpty(opponentHand)) {
    return -1;
  }

  // Time budget check (every 10000 nodes to reduce overhead)
  nodeCounter.count++;
  if (nodeCounter.count % 10000 === 0 && performance.now() > deadline) {
    return 0; // timed out
  }

  // Transposition table lookup
  const hash = tt.computeStateHash(myHand, opponentHand, lastMove, passCount);
  const cached = tt.get(hash);
  if (cached !== undefined) {
    return cached;
  }

  // Generate moves based on mode
  // Free lead when: no last move, or two consecutive passes
  const moves: Move[] =
    lastMove === null || passCount >= 1
      ? generateLeadingMoves(myHand)
      : generateFollowingMoves(myHand, lastMove);

  // Move ordering heuristic: bombs first, then more cards first, then rank descending
  moves.sort((a, b) => {
    if (a.type === HandType.PASS) return 1;
    if (b.type === HandType.PASS) return -1;
    // Bombs and rockets first
    const aIsBomb = a.type === HandType.BOMB || a.type === HandType.ROCKET;
    const bIsBomb = b.type === HandType.BOMB || b.type === HandType.ROCKET;
    if (aIsBomb && !bIsBomb) return -1;
    if (!aIsBomb && bIsBomb) return 1;
    // More cards first (closer to emptying hand)
    const cardDiff = b.cards.length - a.cards.length;
    if (cardDiff !== 0) return cardDiff;
    // Then by mainRank descending
    return b.mainRank - a.mainRank;
  });

  let best = -Infinity;

  for (const move of moves) {
    // Compute new state
    const newMyHand = applyMove(myHand, move);

    let newLastMove: Move | null;
    let newPassCount: number;

    if (move.type === HandType.PASS) {
      newLastMove = lastMove;
      newPassCount = passCount + 1;
    } else {
      newLastMove = move;
      newPassCount = 0;
    }

    // Push tree node
    if (tree) {
      tree.pushChild(move, isPlayerMove);
    }

    // Recurse with swapped perspective (negamax: negate result and swap alpha/beta)
    const val = -negamax(
      opponentHand,
      newMyHand,
      newLastMove,
      newPassCount,
      -beta,
      -alpha,
      deadline,
      tt,
      tree,
      !isPlayerMove,
      nodeCounter,
    );

    // Pop tree node
    if (tree) {
      tree.popChild(val);
    }

    best = Math.max(best, val);
    alpha = Math.max(alpha, val);

    // Alpha-beta pruning
    if (alpha >= beta) {
      break;
    }
  }

  // Store in transposition table
  tt.set(hash, best);

  return best;
}
