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

export type Hand = number[]; // length 15, index 0=A(1), index 14=Big Joker(15)

export interface Move {
  type: HandType;
  mainRank: number; // index in the count array (0-14)
  length: number; // number of cards for sequences, or card count
  cards: number[]; // actual card values played (1-15)
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

export interface TreeNode {
  move: Move;
  result: 'win' | 'loss' | 'unknown';
  isPlayerMove: boolean;
  children: TreeNode[];
}

export interface SolverResult {
  winnable: boolean;
  bestMove: Move | null;
  tree: TreeNode | null;
  stats: SearchStats;
}
