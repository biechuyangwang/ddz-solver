import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { TreeNode, Move } from '../../solver/types';
import { formatMoveLabel } from '../../lib/card-utils';

export interface TreeNodeData {
  [key: string]: unknown;
  label: string;
  move: Move;
  result: 'win' | 'loss' | 'unknown';
  isPlayerMove: boolean;
  pathIndex: string; // dot-separated child indices: "0", "0.1", "0.1.2"
  hasChildren: boolean;
  expanded: boolean;
  depth: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 64;

/**
 * Flatten the TreeNode tree into flat Node[] and Edge[] arrays.
 * Each node gets a pathIndex ID for state reconstruction.
 * Initially expands to depth 2; deeper nodes start collapsed.
 */
function flattenTree(
  node: TreeNode,
  parentId: string | null,
  path: string,
  depth: number,
  maxExpandDepth: number,
  nodes: Node<TreeNodeData>[],
  edges: Edge[],
): void {
  const nodeId = path || 'root';
  const expanded = depth < maxExpandDepth;
  const hasChildren = node.children.length > 0;

  nodes.push({
    id: nodeId,
    type: 'treeNode',
    position: { x: 0, y: 0 },
    data: {
      label: formatMoveLabel(node.move),
      move: node.move,
      result: node.result,
      isPlayerMove: node.isPlayerMove,
      pathIndex: nodeId,
      hasChildren,
      expanded: expanded && hasChildren,
      depth,
    },
  });

  if (parentId !== null) {
    edges.push({
      id: `e-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'smoothstep',
      style: { stroke: '#d1d5db' }, // gray-300
    });
  }

  if (expanded && hasChildren) {
    node.children.forEach((child, i) => {
      flattenTree(child, nodeId, path ? `${path}.${i}` : `${i}`, depth + 1, maxExpandDepth, nodes, edges);
    });
  }
}

/**
 * Convert TreeNode to React Flow nodes and edges with dagre layout.
 */
export function treeToFlow(tree: TreeNode): { nodes: Node<TreeNodeData>[]; edges: Edge[] } {
  const nodes: Node<TreeNodeData>[] = [];
  const edges: Edge[] = [];
  flattenTree(tree, null, 'root', 0, 2, nodes, edges);

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  nodes.forEach((n) => {
    const pos = g.node(n.id);
    n.position = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 };
  });

  return { nodes, edges };
}

/**
 * Toggle expand/collapse for a specific node.
 * Returns updated nodes and edges arrays. When expanding, adds the node's children
 * from the source tree. When collapsing, marks all descendants as hidden.
 */
export function toggleNodeExpand(
  nodeId: string,
  sourceTree: TreeNode,
  currentNodes: Node<TreeNodeData>[],
  currentEdges: Edge[],
): { nodes: Node<TreeNodeData>[]; edges: Edge[] } {
  const nodeIndex = currentNodes.findIndex((n) => n.id === nodeId);
  if (nodeIndex === -1) return { nodes: currentNodes, edges: currentEdges };

  const node = currentNodes[nodeIndex];
  const data = node.data as TreeNodeData;
  const newExpanded = !data.expanded;

  if (!newExpanded) {
    // Collapse: hide all descendants
    const prefix = nodeId === 'root' ? '' : nodeId + '.';
    const updatedNodes = currentNodes.map((n) => {
      const nData = n.data as TreeNodeData;
      if (n.id === nodeId) {
        return { ...n, data: { ...nData, expanded: false } };
      }
      if (n.id.startsWith(prefix) || n.id.startsWith(nodeId + '.')) {
        return { ...n, hidden: true };
      }
      return n;
    });
    return { nodes: updatedNodes, edges: currentEdges };
  }

  // Expand: find the TreeNode at this path and add its children
  const pathParts = nodeId === 'root' ? [] : nodeId.split('.').slice(1);
  let treeNode: TreeNode = sourceTree;
  for (const part of pathParts) {
    treeNode = treeNode.children[Number(part)];
    if (!treeNode) return { nodes: currentNodes, edges: currentEdges };
  }

  const newNodes = [...currentNodes];
  const newEdges = [...currentEdges];

  // Update the clicked node
  newNodes[nodeIndex] = { ...node, data: { ...data, expanded: true } };

  // Add children
  treeNode.children.forEach((child, i) => {
    const childId = nodeId === 'root' ? `${i}` : `${nodeId}.${i}`;
    const childNode: Node<TreeNodeData> = {
      id: childId,
      type: 'treeNode',
      position: { x: 0, y: 0 },
      data: {
        label: formatMoveLabel(child.move),
        move: child.move,
        result: child.result,
        isPlayerMove: child.isPlayerMove,
        pathIndex: childId,
        hasChildren: child.children.length > 0,
        expanded: false,
        depth: data.depth + 1,
      },
    };
    newNodes.push(childNode);
    newEdges.push({
      id: `e-${nodeId}-${childId}`,
      source: nodeId,
      target: childId,
      type: 'smoothstep',
      style: { stroke: '#d1d5db' },
    });
  });

  // Re-run dagre on visible nodes
  const visibleNodes = newNodes.filter((n) => !n.hidden);
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = newEdges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 80 });
  visibleNodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  visibleEdges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const layoutMap = new Map<string, { x: number; y: number }>();
  visibleNodes.forEach((n) => {
    const pos = g.node(n.id);
    if (pos) layoutMap.set(n.id, { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 });
  });

  const finalNodes = newNodes.map((n) => {
    const pos = layoutMap.get(n.id);
    return pos ? { ...n, position: pos } : n;
  });

  return { nodes: finalNodes, edges: newEdges };
}
