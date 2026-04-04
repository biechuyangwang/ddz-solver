import { expose } from 'comlink';
import { solve, expandNode } from '../solver/solver.js';
import type { SolverOptions, SolverResult, ExpandResult, Move } from '../solver/types.js';

const solverApi = {
  solve(
    playerHand: number[],
    opponentHand: number[],
    options?: SolverOptions,
  ): SolverResult {
    return solve(playerHand, opponentHand, options);
  },

  expandNode(
    playerCards: number[],
    opponentCards: number[],
    pathMoves: Move[],
    options?: SolverOptions,
  ): ExpandResult {
    return expandNode(playerCards, opponentCards, pathMoves, options);
  },
};

expose(solverApi);
export type SolverWorkerApi = typeof solverApi;
