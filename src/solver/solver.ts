import type { SolverOptions, SolverResult, Move, TreeNode } from './types.js';
import { DEFAULT_TIME_BUDGET } from './constants.js';
import { createHand } from './encoding.js';
import { TranspositionTable } from './transposition.js';
import { TreeBuilder } from './tree.js';
import { negamax } from './search.js';

/**
 * Top-level solver API.
 *
 * Per D-02: input is two number arrays (card values) plus optional SolverOptions.
 * Per D-03: output is SolverResult with winnable, bestMove, tree, stats.
 * Per D-04: unwinnable returns { winnable: false, bestMove: null, tree: null }.
 * Per D-05: no best-effort strategy for losing positions.
 * Per SOLV-07: default time budget = 10000ms.
 */
export function solve(
  playerHand: number[],
  opponentHand: number[],
  options?: SolverOptions,
): SolverResult {
  const timeBudget = options?.timeBudget ?? DEFAULT_TIME_BUDGET;
  const firstPlayerIsUser = options?.firstPlayerIsUser ?? true;

  // Encode hands into count-based representation
  const userEncoded = createHand(playerHand);
  const oppEncoded = createHand(opponentHand);

  // Create search infrastructure
  const tt = new TranspositionTable();
  const treeBuilder = new TreeBuilder();
  const nodeCounter = { count: 0 };

  // Create tree root
  treeBuilder.createRoot();

  // Record start time and compute deadline
  const startTime = performance.now();
  const deadline = startTime + timeBudget;

  let result: number;

  if (firstPlayerIsUser) {
    // User leads first. Search from user's perspective.
    result = negamax(
      userEncoded, oppEncoded,
      null, 0,
      -Infinity, Infinity, deadline,
      tt, treeBuilder, true, nodeCounter,
    );
  } else {
    // Opponent leads first. Search from opponent's perspective.
    // If opponent's result > 0, opponent wins -> user loses.
    // If opponent's result < 0, opponent loses -> user wins.
    const oppResult = negamax(
      oppEncoded, userEncoded,
      null, 0,
      -Infinity, Infinity, deadline,
      tt, treeBuilder, false, nodeCounter,
    );
    // Negate: if opponent wins (oppResult > 0), user loses (result < 0)
    result = -oppResult;
  }

  // Record end time
  const endTime = performance.now();

  // Build stats
  const stats = {
    nodesExplored: nodeCounter.count,
    timeMs: endTime - startTime,
    transpositionHits: tt.hits,
  };

  // Determine winnability
  const winnable = result > 0;

  if (winnable) {
    // Find best move: scan root's children for the winning move
    const bestChild = treeBuilder.root.children.find(c => c.result === 'win') ?? null;
    const bestMove: Move | null = bestChild?.move ?? null;
    const tree: TreeNode | null = treeBuilder.root;

    return { winnable: true, bestMove, tree, stats };
  } else {
    // Per D-04/D-05: no best-effort for losing positions
    return { winnable: false, bestMove: null, tree: null, stats };
  }
}
