import { create } from 'zustand';
import { wrap, type Remote } from 'comlink';
import type { SolverResult, TreeNode, Move, ChildNode, ExpandResult } from '../solver/types.js';
import { HandType } from '../solver/types.js';
import type { SolverWorkerApi } from '../worker/solver-worker.js';

type RemoteWorkerApi = Remote<SolverWorkerApi>;

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

  // Client-side tree (built lazily via expandNode)
  tree: TreeNode | null;

  // Elapsed time tracking (for progress display)
  solveStartTime: number | null;

  // Visualization state
  activeTab: 'overview' | 'tree' | 'simulation';
  selectedNodeId: string | null;

  // Simulation state
  currentStepIndex: number;
  autoPlaying: boolean;
  autoPlaySpeed: number; // ms between steps: 3000=0.5x, 1500=1x, 750=2x

  // Loading state for expand operations
  expandingNodeId: string | null;

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

  // Tree expansion actions
  expandTreeNode: (nodePath: string) => Promise<void>;
  callExpandNode: (pathMoves: Move[]) => Promise<ExpandResult>;
  setTree: (tree: TreeNode) => void;

  // Visualization actions
  setActiveTab: (tab: 'overview' | 'tree' | 'simulation') => void;
  selectNode: (nodeId: string | null) => void;
  setStepIndex: (index: number) => void;
  nextStep: (maxSteps: number) => void;
  prevStep: () => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;
  setAutoPlaySpeed: (speed: number) => void;
}

// Worker reference — kept alive for on-demand expansion
let currentWorker: Worker | null = null;
let workerApi: RemoteWorkerApi | null = null;

function getWorker(): { worker: Worker; api: RemoteWorkerApi } {
  if (currentWorker && workerApi) {
    return { worker: currentWorker, api: workerApi };
  }
  currentWorker = new Worker(
    new URL('../worker/solver-worker.ts', import.meta.url),
    { type: 'module' },
  );
  workerApi = wrap<SolverWorkerApi>(currentWorker);
  return { worker: currentWorker, api: workerApi };
}

function terminateWorker() {
  if (currentWorker) {
    currentWorker.terminate();
    currentWorker = null;
    workerApi = null;
  }
}

/** Navigate to a tree node by dot-separated path (e.g. "0.2.1") */
function getNodeAtPath(root: TreeNode, path: string): TreeNode | null {
  if (!path || path === 'root') return root;
  let current = root;
  for (const part of path.split('.')) {
    const idx = Number(part);
    const child = current.children[idx];
    if (!child) return null;
    current = child;
  }
  return current;
}

/** Collect moves along a path from root to a node */
function collectPathMoves(root: TreeNode, path: string): Move[] {
  if (!path || path === 'root') return [];
  const moves: Move[] = [];
  let current = root;
  for (const part of path.split('.')) {
    const idx = Number(part);
    const child = current.children[idx];
    if (!child) break;
    moves.push(child.move);
    current = child;
  }
  return moves;
}

export const useGameStore = create<GameState>((set, get) => ({
  playerCards: [],
  opponentCards: [],
  firstPlayerIsUser: true,
  status: 'idle',
  result: null,
  tree: null,
  errorMessage: null,
  solveStartTime: null,
  activeTab: 'overview',
  selectedNodeId: null,
  currentStepIndex: 0,
  autoPlaying: false,
  autoPlaySpeed: 1500,
  expandingNodeId: null,

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
    terminateWorker();
    set({
      playerCards: [],
      opponentCards: [],
      firstPlayerIsUser: true,
      status: 'idle',
      result: null,
      tree: null,
      errorMessage: null,
      solveStartTime: null,
      activeTab: 'overview',
      selectedNodeId: null,
      currentStepIndex: 0,
      autoPlaying: false,
      autoPlaySpeed: 1500,
      expandingNodeId: null,
    });
  },

  setFirstPlayer: (isUser) => set({ firstPlayerIsUser: isUser }),

  startSolving: () => {
    const { playerCards, opponentCards, firstPlayerIsUser } = get();
    const { api } = getWorker();

    set({ status: 'solving', result: null, tree: null, errorMessage: null, solveStartTime: Date.now() });

    api
      .solve(playerCards, opponentCards, { firstPlayerIsUser })
      .then((result) => {
        set({ status: 'done', result, solveStartTime: null });

        // Build root-level tree by expanding the root
        return api.expandNode(playerCards, opponentCards, [], { firstPlayerIsUser });
      })
      .then((expandResult) => {
        const { result, firstPlayerIsUser } = get();
        // Build a synthetic root TreeNode
        const root: TreeNode = {
          move: { type: HandType.PASS, mainRank: 0, length: 0, cards: [] },
          result: result?.winnable ? 'win' : 'loss',
          isPlayerMove: firstPlayerIsUser,
          children: expandResult.children.map((c) => ({
            move: c.move,
            result: c.result,
            isPlayerMove: c.isPlayerMove,
            children: [],
            loaded: false,
          })),
          loaded: true,
        };
        set({ tree: root });
      })
      .catch((err: unknown) => {
        if (currentWorker === null) return; // cancelled
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
    terminateWorker();
    set({ status: 'idle', solveStartTime: null });
  },

  expandTreeNode: async (nodePath: string) => {
    const { tree, playerCards, opponentCards, firstPlayerIsUser, expandingNodeId } = get();
    if (!tree || expandingNodeId) return; // already expanding something

    const node = getNodeAtPath(tree, nodePath);
    if (!node || node.loaded) return; // already loaded or not found

    set({ expandingNodeId: nodePath });

    const { api } = getWorker();

    try {
      const pathMoves = collectPathMoves(tree, nodePath);
      const expandResult = await api.expandNode(playerCards, opponentCards, pathMoves, { firstPlayerIsUser });

      // Clone tree and update the node's children
      const newTree = cloneTree(tree);
      const targetNode = getNodeAtPath(newTree, nodePath);
      if (targetNode) {
        targetNode.children = expandResult.children.map((c) => ({
          move: c.move,
          result: c.result,
          isPlayerMove: c.isPlayerMove,
          children: [],
          loaded: false,
        }));
        targetNode.loaded = true;
      }
      set({ tree: newTree, expandingNodeId: null });
    } catch {
      set({ expandingNodeId: null });
    }
  },

  setTree: (tree) => set({ tree }),

  callExpandNode: async (pathMoves: Move[]) => {
    const { playerCards, opponentCards, firstPlayerIsUser } = get();
    const { api } = getWorker();
    return api.expandNode(playerCards, opponentCards, pathMoves, { firstPlayerIsUser });
  },

  setActiveTab: (tab) => set({ activeTab: tab, selectedNodeId: null }),
  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setStepIndex: (index) => set({ currentStepIndex: index }),
  nextStep: (maxSteps) => set((s) => ({ currentStepIndex: Math.min(s.currentStepIndex + 1, maxSteps - 1) })),
  prevStep: () => set((s) => ({ currentStepIndex: Math.max(s.currentStepIndex - 1, 0) })),
  startAutoPlay: () => set({ autoPlaying: true }),
  stopAutoPlay: () => set({ autoPlaying: false }),
  setAutoPlaySpeed: (speed) => set({ autoPlaySpeed: speed }),
}));

/** Deep-clone a TreeNode (needed for immutable state updates) */
function cloneTree(node: TreeNode): TreeNode {
  return {
    move: node.move,
    result: node.result,
    isPlayerMove: node.isPlayerMove,
    children: node.children.map((c) => cloneTree(c)),
    loaded: node.loaded,
  };
}
