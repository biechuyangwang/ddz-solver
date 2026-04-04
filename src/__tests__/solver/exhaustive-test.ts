import { solve } from '../../solver/solver.js';
import { HandType } from '../../solver/types.js';

// Player: A, A, J, J, 6, 3, 3 → 1, 1, 11, 11, 6, 3, 3
// Opponent: 大王, 小王, J, J, 6, 7 → 15, 14, 11, 11, 6, 7
const result = solve([1, 1, 11, 11, 6, 3, 3], [15, 14, 11, 11, 6, 7]);

console.log('Winnable:', result.winnable);
console.log('Best move:', result.bestMove?.type, result.bestMove?.cards);
console.log('Stats:', JSON.stringify(result.stats));

if (result.tree) {
  function countNodes(node: any): number {
    let count = 1;
    for (const child of node.children) {
      count += countNodes(child);
    }
    return count;
  }

  function printTree(node: any, indent = '', maxDepth = 8): void {
    if (indent.length / 2 > maxDepth) {
      console.log(indent + '...');
      return;
    }
    const who = node.isPlayerMove ? '我方' : '对方';
    const moveStr = node.move.type === 'PASS' ? '过' : node.move.cards.join(',');
    console.log(`${indent}${who} ${moveStr} [${node.result}] (${node.children.length} children)`);
    for (const child of node.children) {
      printTree(child, indent + '  ', maxDepth);
    }
  }

  console.log('Total tree nodes:', countNodes(result.tree));
  console.log('Root children:', result.tree.children.length);
  console.log('');
  console.log('=== Decision Tree ===');
  printTree(result.tree);
} else {
  console.log('No tree (position unwinnable or search bailed out)');
}
