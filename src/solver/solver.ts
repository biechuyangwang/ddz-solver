import type { SolverOptions, SolverResult, Move, ChildNode, ExpandResult, SearchStats } from './types.js';
import { HandType } from './types.js';
import { createHand, applyMove, handIsEmpty } from './encoding.js';
import { TranspositionTable } from './transposition.js';
import { generateLeadingMoves, generateFollowingMoves } from './move-gen.js';
import { negamaxValue } from './search.js';

/**
 * Solve — determines if the first player can win.
 * Returns only the result and best move (no tree — avoids serialization issues).
 */
export function solve(
  playerCards: number[],
  opponentCards: number[],
  options?: SolverOptions,
): SolverResult {
  const firstPlayerIsUser = options?.firstPlayerIsUser ?? true;
  const userEncoded = createHand(playerCards);
  const oppEncoded = createHand(opponentCards);

  const tt = new TranspositionTable();
  const nodeCounter = { count: 0 };
  const startTime = performance.now();

  // Compute root value from first player's perspective
  let rootValue: number;
  if (firstPlayerIsUser) {
    rootValue = negamaxValue(userEncoded, oppEncoded, null, 0, nodeCounter, tt);
  } else {
    const oppValue = negamaxValue(oppEncoded, userEncoded, null, 0, nodeCounter, tt);
    rootValue = -oppValue;
  }

  const endTime = performance.now();
  const winnable = rootValue > 0;

  // Find best move by expanding root level
  let bestMove: Move | null = null;
  if (winnable) {
    const expanded = expandNode(playerCards, opponentCards, [], options);
    const winner = expanded.children.find(c => c.result === 'win');
    bestMove = winner?.move ?? null;
  }

  return {
    winnable,
    bestMove,
    tree: null,
    stats: {
      nodesExplored: nodeCounter.count,
      timeMs: endTime - startTime,
      transpositionHits: tt.hits,
    },
  };
}

/**
 * Expand one level of the game tree at the given path.
 * Replays pathMoves from the initial state, then computes all children
 * with their results using TT-enabled negamax.
 *
 * This is the core of the on-demand architecture — each call returns only
 * one level of children, keeping the response small and serializable.
 */
export function expandNode(
  playerCards: number[],
  opponentCards: number[],
  pathMoves: Move[],
  options?: SolverOptions,
): ExpandResult {
  const firstPlayerIsUser = options?.firstPlayerIsUser ?? true;

  // 1. Replay moves to reconstruct current game state
  let playerHand = createHand(playerCards);
  let opponentHand = createHand(opponentCards);
  let lastMove: Move | null = null;
  let passCount = 0;
  let isPlayerTurn = firstPlayerIsUser;

  for (const move of pathMoves) {
    if (isPlayerTurn) {
      playerHand = applyMove(playerHand, move);
    } else {
      opponentHand = applyMove(opponentHand, move);
    }
    if (move.type === HandType.PASS) {
      passCount++;
    } else {
      lastMove = move;
      passCount = 0;
    }
    isPlayerTurn = !isPlayerTurn;
  }

  // 2. Check terminal — no children if game is over
  if (handIsEmpty(playerHand) || handIsEmpty(opponentHand)) {
    return { children: [], stats: { nodesExplored: 0, timeMs: 0, transpositionHits: 0 } };
  }

  // 3. Generate moves for the current player
  const myHand = isPlayerTurn ? playerHand : opponentHand;
  const theirHand = isPlayerTurn ? opponentHand : playerHand;

  const moves = lastMove === null || passCount >= 1
    ? generateLeadingMoves(myHand)
    : generateFollowingMoves(myHand, lastMove);

  // 4. Evaluate each child with TT-enabled negamax
  const tt = new TranspositionTable();
  const nodeCounter = { count: 0 };
  const startTime = performance.now();

  const children: ChildNode[] = [];

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

    // Value from mover's perspective, then convert to player's perspective
    const val = -negamaxValue(theirHand, newMyHand, newLastMove, newPassCount, nodeCounter, tt);
    const playerResult = isPlayerTurn ? val : -val;
    const result = playerResult > 0 ? 'win' : playerResult < 0 ? 'loss' : 'unknown' as const;

    children.push({ move, result, isPlayerMove: isPlayerTurn });
  }

  const endTime = performance.now();
  return {
    children,
    stats: { nodesExplored: nodeCounter.count, timeMs: endTime - startTime, transpositionHits: tt.hits },
  };
}
