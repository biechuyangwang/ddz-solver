import type { Hand, Move, TreeNode } from '../solver/types';
import { createHand, applyMove } from '../solver/encoding';

export interface GameStateAtNode {
  playerHand: Hand;
  opponentHand: Hand;
  lastMove: Move | null;
  passCount: number;
}

/**
 * Given a path of child indices from root, walk the tree and collect
 * the moves along that path, then reconstruct the game state.
 */
export function reconstructState(
  initialPlayerCards: number[],
  initialOpponentCards: number[],
  tree: TreeNode,
  childIndices: number[],
): GameStateAtNode {
  let playerHand = createHand(initialPlayerCards);
  let opponentHand = createHand(initialOpponentCards);
  let lastMove: Move | null = null;
  let passCount = 0;

  let current: TreeNode = tree;
  for (const idx of childIndices) {
    const child = current.children[idx];
    if (!child) break;

    if (child.isPlayerMove) {
      playerHand = applyMove(playerHand, child.move);
    } else {
      opponentHand = applyMove(opponentHand, child.move);
    }

    if (child.move.type === 'PASS' /* HandType.PASS */) {
      passCount++;
    } else {
      lastMove = child.move;
      passCount = 0;
    }
    current = child;
  }

  return { playerHand, opponentHand, lastMove, passCount };
}

/**
 * Parse a dot-separated path string (e.g. "0.2.1") into an array of indices.
 * Empty string or "root" returns [].
 */
export function parseNodePath(path: string): number[] {
  if (!path || path === 'root') return [];
  return path.split('.').map(Number);
}

/**
 * Navigate to a tree node by following child indices from root.
 * Returns the node at the given path, or null if path is invalid.
 */
export function getNodeAtPath(tree: TreeNode, childIndices: number[]): TreeNode | null {
  let current: TreeNode = tree;
  for (const idx of childIndices) {
    const child = current.children[idx];
    if (!child) return null;
    current = child;
  }
  return current;
}
