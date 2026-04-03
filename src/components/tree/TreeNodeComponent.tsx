import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { cn } from '../../lib/cn';
import type { TreeNodeData } from './tree-layout';

type TreeNodeNodeType = Node<TreeNodeData, 'treeNode'>;

const resultStyles: Record<string, string> = {
  win: 'border-green-500 bg-node-win-bg',
  loss: 'border-red-400 bg-node-loss-bg',
  unknown: 'border-gray-300 bg-node-unknown-bg',
};

const rootStyle = 'border-gray-400 bg-gray-100';

function TreeNodeComponent({ data, id }: NodeProps<TreeNodeNodeType>) {
  const isRoot = id === 'root';
  const borderStyle = isRoot ? rootStyle : (resultStyles[data.result] ?? resultStyles.unknown);

  return (
    <div
      className={cn(
        'px-3 py-2 rounded-lg border-2 min-w-[140px]',
        borderStyle,
      )}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-800 truncate">
          {isRoot ? '初始局面' : data.label}
        </span>
        {data.hasChildren && (
          <span className="text-xs text-gray-400 shrink-0">
            {data.expanded ? '[-]' : '[+]'}
          </span>
        )}
      </div>
      {!isRoot && (
        <span className={cn(
          'text-xs font-semibold',
          data.isPlayerMove ? 'text-step-player' : 'text-step-opponent',
        )}>
          {data.isPlayerMove ? '我方' : '对方'}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
    </div>
  );
}

// CRITICAL: Must be defined outside component to prevent React Flow re-mounting all nodes
export const nodeTypes = { treeNode: TreeNodeComponent };
