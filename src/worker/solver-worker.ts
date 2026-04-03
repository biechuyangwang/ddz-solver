import { expose } from 'comlink';
import { solve } from '../solver/solver.js';
import type { SolverOptions, SolverResult } from '../solver/types.js';

const solverApi = {
  solve(
    playerHand: number[],
    opponentHand: number[],
    options?: SolverOptions,
  ): SolverResult {
    return solve(playerHand, opponentHand, options);
  },
};

expose(solverApi);
export type SolverWorkerApi = typeof solverApi;
