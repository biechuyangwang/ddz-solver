import type { TreeNode, Move, ChildNode } from '../solver/types';

export interface SimulationStep {
  move: Move;
  isPlayerMove: boolean;
  result: 'win' | 'loss' | 'unknown';
  /** Child indices path from root to this step's node */
  pathIndices: number[];
  /** All sibling nodes at this level (opponent's possible responses) */
  siblings: ChildNode[];
  /** Index of this node among siblings */
  siblingIndex: number;
}

/**
 * Build a simulation step from expandNode results.
 * Used to build steps incrementally instead of walking the full tree.
 */
export function buildStep(
  children: ChildNode[],
  pickIndex: number,
  parentPath: number[],
): SimulationStep {
  const child = children[pickIndex];
  return {
    move: child.move,
    isPlayerMove: child.isPlayerMove,
    result: child.result,
    pathIndices: [...parentPath, pickIndex],
    siblings: children,
    siblingIndex: pickIndex,
  };
}

/**
 * Pick the winning move index from a list of children for the player.
 * Returns 0 as default if no winning child found.
 */
export function pickWinningIndex(children: ChildNode[]): number {
  const winIdx = children.findIndex(c => c.result === 'win');
  return winIdx >= 0 ? winIdx : 0;
}

/**
 * Collect moves along a path for the worker's expandNode call.
 */
export function collectMovesFromSteps(steps: SimulationStep[]): Move[] {
  return steps.map(s => s.move);
}
