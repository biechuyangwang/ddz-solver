import { HandType } from './types.js';
import type { Move, TreeNode } from './types.js';

/**
 * Builds the decision tree as a side effect during negamax search.
 * Maintains a stack of TreeNodes to track the current position in the tree.
 */
export class TreeBuilder {
  private stack: TreeNode[] = [];
  private _root: TreeNode | null = null;

  /**
   * Create the root node of the decision tree.
   * The root has a PASS move placeholder and no player move flag.
   */
  createRoot(): TreeNode {
    const root: TreeNode = {
      move: { type: HandType.PASS, mainRank: 0, length: 0, cards: [] },
      result: 'unknown',
      isPlayerMove: false,
      children: [],
      loaded: true,
    };
    this._root = root;
    this.stack = [root];
    return root;
  }

  /**
   * Add a child node to the current top of the stack.
   * Pushes the child onto the stack so subsequent operations apply to it.
   */
  pushChild(move: Move, isPlayerMove: boolean): TreeNode {
    const parent = this.stack[this.stack.length - 1];
    const child: TreeNode = {
      move,
      result: 'unknown',
      isPlayerMove,
      children: [],
      loaded: true,
    };
    parent.children.push(child);
    this.stack.push(child);
    return child;
  }

  /**
   * Pop the current node from the stack.
   * Sets the node's result from the PLAYER's perspective (not the mover's).
   *
   * Negamax values are from the mover's perspective:
   *   val > 0 = mover wins, val < 0 = mover loses
   *
   * We convert to the player's perspective:
   *   - Player nodes: val > 0 → 'win' (player wins)
   *   - Opponent nodes: val > 0 → 'loss' (opponent wins = player loses)
   */
  popChild(result: number): void {
    const node = this.stack.pop();
    if (node) {
      // result is from the mover's perspective; invert for opponent nodes
      const playerResult = node.isPlayerMove ? result : -result;
      node.result = playerResult > 0 ? 'win' : playerResult < 0 ? 'loss' : 'unknown';
    }
  }

  /**
   * Returns the current top of the stack, or null if empty.
   */
  currentNode(): TreeNode | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  /**
   * The root node of the decision tree.
   */
  get root(): TreeNode {
    if (!this._root) {
      throw new Error('Tree not initialized. Call createRoot() first.');
    }
    return this._root;
  }
}
