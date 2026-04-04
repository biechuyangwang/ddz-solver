export enum HandType {
  SINGLE = 'SINGLE',
  PAIR = 'PAIR',
  TRIPLE = 'TRIPLE',
  TRIPLE_SINGLE = 'TRIPLE_SINGLE',
  TRIPLE_PAIR = 'TRIPLE_PAIR',
  STRAIGHT = 'STRAIGHT',
  CONSECUTIVE_PAIRS = 'CONSECUTIVE_PAIRS',
  AIRPLANE = 'AIRPLANE',
  AIRPLANE_SINGLES = 'AIRPLANE_SINGLES',
  AIRPLANE_PAIRS = 'AIRPLANE_PAIRS',
  FOUR_TWO_SINGLES = 'FOUR_TWO_SINGLES',
  FOUR_TWO_PAIRS = 'FOUR_TWO_PAIRS',
  BOMB = 'BOMB',
  ROCKET = 'ROCKET',
  PASS = 'PASS',
}

export type Hand = number[]; // length 15, DDZ rank indices (0=3, 11=A, 12=2, 13=小王, 14=大王)

export interface Move {
  type: HandType;
  mainRank: number;
  length: number;
  cards: number[]; // actual card values (1-15)
}

export const PASS_MOVE: Move = {
  type: HandType.PASS,
  mainRank: 0,
  length: 0,
  cards: [],
};

export interface SolverOptions {
  timeBudget?: number;
  firstPlayerIsUser?: boolean;
}

export interface SearchStats {
  nodesExplored: number;
  timeMs: number;
  transpositionHits: number;
}

/** A child node returned by expandNode — lightweight, no subtree */
export interface ChildNode {
  move: Move;
  result: 'win' | 'loss' | 'unknown';
  isPlayerMove: boolean;
}

/** Client-side tree node — children loaded lazily via expandNode */
export interface TreeNode {
  move: Move;
  result: 'win' | 'loss' | 'unknown';
  isPlayerMove: boolean;
  children: TreeNode[];
  /** Whether children have been fetched from the worker */
  loaded: boolean;
}

export interface SolverResult {
  winnable: boolean;
  bestMove: Move | null;
  tree: TreeNode | null;
  stats: SearchStats;
}

export interface ExpandResult {
  children: ChildNode[];
  stats: SearchStats;
}
