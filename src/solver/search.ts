import { HandType } from './types.js';
import type { Hand, Move } from './types.js';
import { handIsEmpty, applyMove } from './encoding.js';
import { generateLeadingMoves, generateFollowingMoves } from './move-gen.js';
import { TranspositionTable } from './transposition.js';
import { TreeBuilder } from './tree.js';

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
    lastMove === null || passCount >= 2
      ? generateLeadingMoves(myHand)
      : generateFollowingMoves(myHand, lastMove);

  // Move ordering heuristic: bombs first, then by mainRank descending
  // This causes early alpha-beta cutoffs
  moves.sort((a, b) => {
    // PASS moves to the end
    if (a.type === HandType.PASS) return 1;
    if (b.type === HandType.PASS) return -1;
    // Bombs and rockets first
    const aIsBomb = a.type === HandType.BOMB || a.type === HandType.ROCKET;
    const bIsBomb = b.type === HandType.BOMB || b.type === HandType.ROCKET;
    if (aIsBomb && !bIsBomb) return -1;
    if (!aIsBomb && bIsBomb) return 1;
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
