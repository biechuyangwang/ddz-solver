import { solve, expandNode } from '../../solver/solver.js';

const playerCards = [1, 1, 11, 11, 6, 3, 3];
const opponentCards = [15, 14, 11, 11, 6, 7];

const result = solve(playerCards, opponentCards);
console.log('可胜:', result.winnable, '| 探索节点:', result.stats.nodesExplored, '| 耗时:', result.stats.timeMs.toFixed(0), 'ms');
console.log('最佳首手:', result.bestMove?.cards);
console.log('');

const V: Record<number,string> = {1:'A',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'10',11:'J',12:'Q',13:'K',14:'小王',15:'大王'};
const fmt = (move: any) => {
  const mv = move.type === 'PASS' ? '过' : move.cards.map((c:number) => V[c]||c).join(',');
  return mv;
};

console.log('=== 我方: A A J J 6 3 3 | 对方: 大王 小王 J J 6 7 ===\n');

// Expand root level
const root = expandNode(playerCards, opponentCards, []);

// Root children
console.log('【我方可选首手】');
for (const c of root.children) {
  const r = c.result === 'win' ? '✓必胜' : '✗必败';
  console.log(`  ${r} 出 ${fmt(c.move)}`);
}

// For each winning first move, show opponent responses and my counters
console.log('\n【必胜路径详解】');
for (const first of root.children) {
  if (first.result !== 'win') continue;
  console.log(`\n我方首手: ${fmt(first.move)}`);

  // Expand from first move
  const oppResponses = expandNode(playerCards, opponentCards, [first.move]);
  console.log('  对方可应对:');
  for (const opp of oppResponses.children.slice(0, 5)) {
    const oppResult = opp.result === 'win' ? '→对方胜' : '→我方胜';
    console.log(`    对方${fmt(opp.move)} ${oppResult}`);
  }
  if (oppResponses.children.length > 5) console.log(`    ...(共${oppResponses.children.length}种应对)`);
}
