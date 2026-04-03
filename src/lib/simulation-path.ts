import type { TreeNode, Move } from '../solver/types';

export interface SimulationStep {
  node: TreeNode;
  move: Move;
  isPlayerMove: boolean;
  result: 'win' | 'loss' | 'unknown';
  /** Child indices path from root to this step's node */
  pathIndices: number[];
  /** All sibling nodes at this level (opponent's possible responses) */
  siblings: TreeNode[];
  /** Index of this node among siblings (-1 for root's children) */
  siblingIndex: number;
}

/**
 * Extract a walkable simulation path through the decision tree.
 * For player moves: pick the child with result === 'win'.
 * For opponent moves: default to first child, but include all siblings.
 * Returns steps starting from root's immediate children (skipping the synthetic root).
 */
export function extractSimulationSteps(tree: TreeNode): SimulationStep[] {
  const steps: SimulationStep[] = [];

  function walk(node: TreeNode, pathIndices: number[]): void {
    if (node.children.length === 0) return;

    if (node.children[0]?.isPlayerMove) {
      // Player's turn: pick the winning child
      const winIdx = node.children.findIndex(c => c.result === 'win');
      const pickIdx = winIdx >= 0 ? winIdx : 0;
      const child = node.children[pickIdx];

      steps.push({
        node: child,
        move: child.move,
        isPlayerMove: child.isPlayerMove,
        result: child.result,
        pathIndices: [...pathIndices, pickIdx],
        siblings: node.children,
        siblingIndex: pickIdx,
      });

      walk(child, [...pathIndices, pickIdx]);
    } else {
      // Opponent's turn: show all children, default to first
      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        steps.push({
          node: child,
          move: child.move,
          isPlayerMove: child.isPlayerMove,
          result: child.result,
          pathIndices: [...pathIndices, i],
          siblings: children,
          siblingIndex: i,
        });
      }
      // Continue through the first opponent response (default path)
      walk(children[0], [...pathIndices, 0]);
    }
  }

  walk(tree, []);
  return steps;
}

/**
 * Re-extract simulation path when the user picks a specific opponent response.
 * Given a step index and a sibling index, re-route from that point.
 */
export function rerouteSimulationPath(
  tree: TreeNode,
  originalSteps: SimulationStep[],
  atStepIndex: number,
  newSiblingIndex: number,
): SimulationStep[] {
  // Keep steps before the reroute point
  const kept = originalSteps.slice(0, atStepIndex);
  const rerouteStep = originalSteps[atStepIndex];

  // Build new path from the selected sibling
  const newPathIndices = rerouteStep.pathIndices.slice(0, -1);
  newPathIndices.push(newSiblingIndex);

  const newSteps: SimulationStep[] = [];
  // We need to re-extract from the tree starting at the sibling's parent
  // using the rerouted path
  let parent: TreeNode = tree;
  for (const idx of newPathIndices.slice(0, -1)) {
    parent = parent.children[idx];
  }
  const selectedChild = parent.children[newSiblingIndex];

  // Recursively build remaining steps
  function walk(node: TreeNode, pathIndices: number[]): void {
    if (node.children.length === 0) return;
    if (node.children[0]?.isPlayerMove) {
      const winIdx = node.children.findIndex(c => c.result === 'win');
      const pickIdx = winIdx >= 0 ? winIdx : 0;
      const child = node.children[pickIdx];
      newSteps.push({
        node: child, move: child.move, isPlayerMove: child.isPlayerMove,
        result: child.result, pathIndices: [...pathIndices, pickIdx],
        siblings: node.children, siblingIndex: pickIdx,
      });
      walk(child, [...pathIndices, pickIdx]);
    } else {
      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        newSteps.push({
          node: child, move: child.move, isPlayerMove: child.isPlayerMove,
          result: child.result, pathIndices: [...pathIndices, i],
          siblings: node.children, siblingIndex: i,
        });
      }
      walk(node.children[0], [...pathIndices, 0]);
    }
  }

  walk(selectedChild, newPathIndices);
  return [...kept, ...newSteps];
}
