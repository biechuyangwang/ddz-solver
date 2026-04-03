import type { TreeNode } from '../../solver/types';
import { reconstructState, parseNodePath } from '../../lib/tree-state';
import { useGameStore } from '../../store/game-store';
import { VALUE_DISPLAY, formatMoveLabel } from '../../lib/card-utils';
import { handSize } from '../../solver/encoding';
import { cn } from '../../lib/cn';
import { X } from 'lucide-react';

interface NodeDetailPanelProps {
  nodeId: string;
  tree: TreeNode;
}

export function NodeDetailPanel({ nodeId, tree }: NodeDetailPanelProps) {
  const playerCards = useGameStore((s) => s.playerCards);
  const opponentCards = useGameStore((s) => s.opponentCards);
  const selectNode = useGameStore((s) => s.selectNode);

  const isRoot = nodeId === 'root';
  const childIndices = parseNodePath(nodeId === 'root' ? '' : nodeId.replace('root.', ''));
  const state = reconstructState(playerCards, opponentCards, tree, childIndices);

  // Get the node itself for move/result info
  let node: TreeNode = tree;
  for (const idx of childIndices) {
    node = node.children[idx];
    if (!node) break;
  }

  const handleClose = () => selectNode(null);

  // Convert hand (count array) to displayable card list
  const handToCards = (hand: number[]): string[] => {
    const cards: string[] = [];
    for (let i = 0; i < hand.length; i++) {
      for (let j = 0; j < hand[i]; j++) {
        cards.push(VALUE_DISPLAY[i + 1] ?? String(i + 1));
      }
    }
    return cards;
  };

  return (
    <div
      className="w-[280px] border-l border-gray-200 bg-white p-4 overflow-y-auto shrink-0"
      role="complementary"
      aria-label="节点详情"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800">节点详情</h3>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="关闭"
        >
          <X size={18} />
        </button>
      </div>

      {/* Move played */}
      {!isRoot && (
        <div className="mb-4">
          <span className="text-xs font-semibold text-gray-500">出牌</span>
          <p className="text-sm text-gray-800 mt-1">{formatMoveLabel(node.move)}</p>
          <span className={cn(
            'text-xs font-semibold',
            node.isPlayerMove ? 'text-step-player' : 'text-step-opponent',
          )}>
            {node.isPlayerMove ? '我方' : '对方'}
          </span>
        </div>
      )}

      {/* Result */}
      {!isRoot && (
        <div className="mb-4">
          <span className="text-xs font-semibold text-gray-500">结果</span>
          <p className={cn(
            'text-sm font-medium mt-1',
            node.result === 'win' ? 'text-green-600' : node.result === 'loss' ? 'text-red-600' : 'text-gray-500',
          )}>
            {node.result === 'win' ? '胜' : node.result === 'loss' ? '负' : '未知'}
          </p>
        </div>
      )}

      {/* Player's remaining hand */}
      <div className="mb-4">
        <span className="text-xs font-semibold text-gray-500">我方剩余手牌</span>
        <p className="text-sm text-gray-800 mt-1">
          {handToCards(state.playerHand).join(' ') || '无'}
        </p>
        <span className="text-xs text-gray-400">
          ({handSize(state.playerHand)} 张)
        </span>
      </div>

      {/* Opponent's remaining hand */}
      <div className="mb-4">
        <span className="text-xs font-semibold text-gray-500">对方剩余手牌</span>
        <p className="text-sm text-gray-800 mt-1">
          {handToCards(state.opponentHand).join(' ') || '无'}
        </p>
        <span className="text-xs text-gray-400">
          ({handSize(state.opponentHand)} 张)
        </span>
      </div>
    </div>
  );
}
