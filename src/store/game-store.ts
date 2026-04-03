import { create } from 'zustand';
import { wrap } from 'comlink';
import type { SolverResult } from '../solver/types.js';
import type { SolverWorkerApi } from '../worker/solver-worker.js';

export type PlayerTarget = 'player' | 'opponent';
export type SolverStatus = 'idle' | 'solving' | 'done' | 'error';

interface GameState {
  // Card input state
  playerCards: number[];
  opponentCards: number[];
  firstPlayerIsUser: boolean;

  // Solver state
  status: SolverStatus;
  result: SolverResult | null;
  errorMessage: string | null;

  // Elapsed time tracking (for progress display)
  solveStartTime: number | null;

  // Actions
  addCard: (target: PlayerTarget, cardValue: number) => void;
  removeCard: (target: PlayerTarget, cardValue: number) => void;
  clearPlayerCards: (target: PlayerTarget) => void;
  resetAll: () => void;
  setFirstPlayer: (isUser: boolean) => void;
  startSolving: () => void;
  setResult: (result: SolverResult) => void;
  setError: (message: string) => void;
  cancelSolving: () => void;
}

// Worker reference for cancellation
let currentWorker: Worker | null = null;

export const useGameStore = create<GameState>((set, get) => ({
  playerCards: [],
  opponentCards: [],
  firstPlayerIsUser: true,
  status: 'idle',
  result: null,
  errorMessage: null,
  solveStartTime: null,

  addCard: (target, cardValue) =>
    set((state) => ({
      [target === 'player' ? 'playerCards' : 'opponentCards']: [
        ...state[target === 'player' ? 'playerCards' : 'opponentCards'],
        cardValue,
      ],
    })),

  removeCard: (target, cardValue) =>
    set((state) => ({
      [target === 'player' ? 'playerCards' : 'opponentCards']:
        state[target === 'player' ? 'playerCards' : 'opponentCards'].filter(
          (_, i, arr) => {
            // Remove the last occurrence of cardValue
            const lastIdx = arr.lastIndexOf(cardValue);
            return i !== lastIdx;
          },
        ),
    })),

  clearPlayerCards: (target) =>
    set({
      [target === 'player' ? 'playerCards' : 'opponentCards']: [],
    }),

  resetAll: () => {
    // Terminate any running worker
    if (currentWorker) {
      currentWorker.terminate();
      currentWorker = null;
    }
    set({
      playerCards: [],
      opponentCards: [],
      firstPlayerIsUser: true,
      status: 'idle',
      result: null,
      errorMessage: null,
      solveStartTime: null,
    });
  },

  setFirstPlayer: (isUser) => set({ firstPlayerIsUser: isUser }),

  startSolving: () => {
    const { playerCards, opponentCards, firstPlayerIsUser } = get();

    // Create a new Worker for this solve
    currentWorker = new Worker(
      new URL('../worker/solver-worker.ts', import.meta.url),
      { type: 'module' },
    );
    const api = wrap<SolverWorkerApi>(currentWorker);

    set({ status: 'solving', result: null, errorMessage: null, solveStartTime: Date.now() });

    // Invoke solver via Worker
    api
      .solve(playerCards, opponentCards, { firstPlayerIsUser })
      .then((result) => {
        set({ status: 'done', result, solveStartTime: null });
        if (currentWorker) {
          currentWorker.terminate();
          currentWorker = null;
        }
      })
      .catch((err: unknown) => {
        // Worker terminated = cancelled, not an error
        if (currentWorker === null) return;
        set({
          status: 'error',
          errorMessage: err instanceof Error ? err.message : '求解失败',
          solveStartTime: null,
        });
      });
  },

  setResult: (result) => set({ status: 'done', result, solveStartTime: null }),

  setError: (message) => set({ status: 'error', errorMessage: message, solveStartTime: null }),

  cancelSolving: () => {
    if (currentWorker) {
      currentWorker.terminate();
      currentWorker = null;
    }
    set({ status: 'idle', solveStartTime: null });
  },
}));
