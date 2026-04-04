import { useState, useCallback, useEffect } from 'react';
import { ReactFlow, Controls, Background, type NodeMouseHandler, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useGameStore } from '../../store/game-store';
import { nodeTypes } from './TreeNodeComponent';
import { treeToFlow, toggleNodeExpand } from './tree-layout';
import type { TreeNodeData } from './tree-layout';
import { NodeDetailPanel } from './NodeDetailPanel';

export function DecisionTreeView() {
  const tree = useGameStore((s) => s.tree);
  const selectedNodeId = useGameStore((s) => s.selectedNodeId);
  const selectNode = useGameStore((s) => s.selectNode);
  const expandTreeNode = useGameStore((s) => s.expandTreeNode);
  const expandingNodeId = useGameStore((s) => s.expandingNodeId);

  // Initialize flow from tree
  const [flowData, setFlowData] = useState(() => {
    if (!tree) return { nodes: [], edges: [] };
    return treeToFlow(tree);
  });

  // Re-compute when tree changes (new solve or expansion)
  useEffect(() => {
    if (tree) {
      setFlowData(treeToFlow(tree));
    }
  }, [tree]);

  const handleNodeClick: NodeMouseHandler<Node<TreeNodeData>> = useCallback((_event, node) => {
    if (!tree) return;

    const nodeData = node.data as TreeNodeData;

    // Select node (show detail panel)
    selectNode(node.id);

    // If not loaded yet, trigger expansion
    if (!nodeData.loaded) {
      expandTreeNode(node.id);
      return;
    }

    // Toggle expand/collapse if node has children
    if (nodeData.hasChildren) {
      setFlowData((prev) => toggleNodeExpand(node.id, tree, prev.nodes, prev.edges));
    }
  }, [tree, selectNode, expandTreeNode]);

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (!tree) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg mb-2">求解完成后显示决策树</p>
        <p className="text-sm">请先输入手牌并点击"求解"</p>
      </div>
    );
  }

  return (
    <div className="flex gap-0 relative" style={{ minHeight: '400px' }}>
      <div className="flex-1 h-[500px]">
        <ReactFlow
          nodes={flowData.nodes}
          edges={flowData.edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Controls showInteractive={false} />
          <Background color="#e5e7eb" gap={20} />
        </ReactFlow>
      </div>
      {selectedNodeId && (
        <NodeDetailPanel
          nodeId={selectedNodeId}
          tree={tree}
        />
      )}
      {expandingNodeId && (
        <div className="absolute top-2 right-2 bg-white px-3 py-1.5 rounded-lg shadow text-sm text-gray-500">
          正在展开节点...
        </div>
      )}
    </div>
  );
}
