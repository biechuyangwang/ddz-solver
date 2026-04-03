# Phase 3: Visualization + Simulation - Research

**Researched:** 2026-04-03
**Domain:** Interactive tree visualization (React Flow), step-by-step simulation, game state reconstruction
**Confidence:** MEDIUM

## Summary

Phase 3 adds two major interactive features to the DDZ solver: (1) an interactive decision tree visualization using @xyflow/react (React Flow), and (2) a step-by-step play simulation mode. Both features are driven by the `TreeNode` data structure already produced by the Phase 1 solver engine. The tree is only returned for winnable positions (`result.tree` is non-null when `result.winnable === true`).

The most critical architectural finding is that **TreeNode does NOT store game state** (remaining hands) at each node -- it only stores `move`, `result`, `isPlayerMove`, and `children`. To display card details at any tree node (TREE-03) and to drive the step-by-step simulation (SIM-01/SIM-02), the planner must build a **game state reconstruction utility** that replays moves from root to any node, tracking the remaining cards in each player's hand. This is a foundational task that both the tree view and simulation view depend on.

The tree can grow large for complex endgames (potentially 500+ nodes), so virtualized rendering (TREE-04) is a requirement. React Flow handles this natively by only rendering visible nodes, but the layout engine must also be efficient. The CLAUDE.md stack specifies `@xyflow/react` for tree viz and `framer-motion` for animations, with `elkjs` as the layout engine recommended in the project stack research.

**Primary recommendation:** Build a game-state reconstruction module first (it unblocks both views), then implement the tree view with React Flow + dagre layout (simpler and sufficient for tree sizes under 1000 nodes), then the simulation view as a separate tab component.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TREE-01 | Interactive tree diagram shows complete winning decision tree | React Flow custom nodes + dagre layout; TreeNode-to-Nodes/Edges conversion |
| TREE-02 | Nodes expandable/collapsible, color-coded (win/lose branches) | React Flow `hidden` property for collapse; node data carries `result` field for coloring |
| TREE-03 | Clicking a tree node shows card details for that state | Game state reconstruction utility (replay moves from root to node) |
| TREE-04 | Virtualized rendering handles large trees (>500 nodes) | React Flow renders only visible viewport nodes natively |
| SIM-01 | Step-by-step mode walks through optimal play sequence move by move | Extract optimal path from tree (follow `result === 'win'` children); game state reconstruction at each step |
| SIM-02 | Each step shows: current player, cards played, remaining hands | Reconstructed game state + `move.cards` + `isPlayerMove` at each step |
| SIM-03 | Opponent's possible responses displayed with winning counter-moves highlighted | At each opponent step, show all children of current node; highlight children where `result === 'win'` |
| SIM-04 | Navigation controls: next/prev step, auto-play, jump to specific step | React state for current step index; interval timer for auto-play; slider or input for jump |
| RSLT-03 | Tab-based view switching between tree and simulation modes | Tab component in result area; controls which view is mounted |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | 12.10.2 | Interactive tree diagram rendering | Specified in CLAUDE.md. Custom nodes, built-in pan/zoom, viewport virtualization, edge rendering. v12 is the current stable line under @xyflow namespace. |
| framer-motion | 12.38.0 | Card play animations, step transitions | Specified in CLAUDE.md. AnimatePresence for enter/exit, layout animations for position changes. v12 supports React 19. |
| dagre | 0.8.5 | Tree layout computation | Simpler API than elkjs for pure tree structures. Sufficient for trees under 1000 nodes (endgame positions typically produce 50-500 nodes). Well-established, lightweight. |
| lucide-react | 1.7.0 | UI icons (play/pause, expand/collapse, navigation) | Specified in CLAUDE.md. Tree-shakeable, consistent design. Needed for simulation controls and tree interaction buttons. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| elkjs | 0.11.1 | Advanced graph layout | Only if dagre proves insufficient for very large trees. More configurable but heavier (WASM-based). Default to dagre. |
| @dagrejs/dagre | 3.0.0 | Newer dagre fork | Alternative to `dagre` 0.8.5. Same API, more actively maintained. Use if `dagre` has type issues. |

### Already Installed (from Phase 2)
| Library | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.4 | UI framework |
| zustand | ^5.0.12 | State management |
| clsx | ^2.1.1 | Conditional CSS classes |
| tailwind-merge | ^3.5.0 | Tailwind class merging |
| comlink | ^4.4.2 | Worker communication |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dagre | elkjs | elkjs is more powerful and maintained but heavier (WASM). dagre is simpler and sufficient for endgame tree sizes. Use elkjs only if layout quality is insufficient. |
| dagre | @dagrejs/dagre 3.0 | Same algorithm, newer fork. If `dagre` types cause issues with TypeScript 6, switch to `@dagrejs/dagre`. |

**Installation:**
```bash
npm install @xyflow/react framer-motion dagre lucide-react
npm install -D @types/dagre
```

**Version verification (2026-04-03):**
- @xyflow/react: 12.10.2 (npm registry)
- framer-motion: 12.38.0 (npm registry)
- dagre: 0.8.5 (npm registry)
- lucide-react: 1.7.0 (npm registry)
- elkjs: 0.11.1 (npm registry)

## Architecture Patterns

### Critical Finding: TreeNode Lacks Game State

The existing `TreeNode` interface from `src/solver/types.ts`:

```typescript
interface TreeNode {
  move: Move;
  result: 'win' | 'loss' | 'unknown';
  isPlayerMove: boolean;
  children: TreeNode[];
}
```

**It does NOT store the remaining hands (game state) at each node.** This means:

1. For TREE-03 (showing card details when clicking a node), we must reconstruct the game state by replaying all moves from the root to that node.
2. For SIM-01/SIM-02 (showing remaining hands at each step), the same reconstruction is needed.
3. The solver's `SolverResult` already includes the original `playerCards` and `opponentCards` from the zustand store, which provides the initial state.

**The reconstruction algorithm:**
- Start with initial hands (from store: `playerCards`, `opponentCards`)
- Walk the path from root to target node
- At each step, apply the move's cards to the appropriate player's hand
- The `isPlayerMove` field tells which player played the move
- Use the existing `createHand()` (count encoding) and `applyMove()` from `src/solver/encoding.ts`

### Recommended Project Structure

```
src/
  components/
    tree/                    # Tree visualization components
      DecisionTreeView.tsx   # Main tree view container with React Flow
      TreeNodeComponent.tsx  # Custom React Flow node (cards + color coding)
      tree-layout.ts         # dagre layout utility (TreeNode -> RF Nodes/Edges)
      tree-utils.ts          # TreeNode traversal, state reconstruction
    simulation/              # Step-by-step simulation components
      SimulationView.tsx     # Main simulation container
      StepDisplay.tsx        # Current step: hands, played cards, player indicator
      SimulationControls.tsx # Next/prev/auto-play/jump navigation
    result/                  # Tab container for tree/simulation switching
      ResultTabs.tsx         # Tab switcher (tree | simulation)
      ResultView.tsx         # Container that mounts the active view
  lib/
    tree-state.ts            # Game state reconstruction from TreeNode path
```

### Pattern 1: TreeNode to React Flow Conversion

**What:** Convert the solver's TreeNode tree into React Flow `Node[]` and `Edge[]` arrays, compute layout positions with dagre.
**When to use:** When the solver returns a result and the tree view mounts.

```typescript
// tree-layout.ts
import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';
import type { TreeNode } from '../../solver/types';

interface TreeNodeData {
  label: string;
  move: TreeNode['move'];
  result: TreeNode['result'];
  isPlayerMove: boolean;
  pathIndex: string; // dot-separated path for reconstruction
  hasChildren: boolean;
  expanded: boolean;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

function flattenTree(
  node: TreeNode,
  parentId: string | null,
  path: string,
  nodes: Node<TreeNodeData>[],
  edges: Edge[],
): void {
  const nodeId = path || 'root';

  nodes.push({
    id: nodeId,
    type: 'treeNode',
    position: { x: 0, y: 0 }, // dagre fills this
    data: {
      label: formatMoveLabel(node.move),
      move: node.move,
      result: node.result,
      isPlayerMove: node.isPlayerMove,
      pathIndex: path,
      hasChildren: node.children.length > 0,
      expanded: true,
    },
  });

  if (parentId !== null) {
    edges.push({
      id: `e-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      type: 'smoothstep',
      animated: false,
    });
  }

  node.children.forEach((child, i) => {
    flattenTree(child, nodeId, `${path}.${i}`, nodes, edges);
  });
}

export function treeToFlow(tree: TreeNode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  flattenTree(tree, null, '0', nodes, edges);

  // Apply dagre layout
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
```

### Pattern 2: Game State Reconstruction

**What:** Given a path through the TreeNode tree, reconstruct the remaining hands at that point.
**When to use:** TREE-03 (click node to see details), SIM-01/SIM-02 (show hands at each step).

```typescript
// tree-state.ts
import type { Hand, Move } from '../solver/types';
import { createHand, applyMove } from '../solver/encoding';

interface GameStateAtNode {
  playerHand: Hand;    // count-encoded remaining cards
  opponentHand: Hand;  // count-encoded remaining cards
  lastMove: Move | null;
  passCount: number;
}

export function reconstructState(
  initialPlayerCards: number[],
  initialOpponentCards: number[],
  moves: Array<{ move: Move; isPlayerMove: boolean }>,
): GameStateAtNode {
  let playerHand = createHand(initialPlayerCards);
  let opponentHand = createHand(initialOpponentCards);
  let lastMove: Move | null = null;
  let passCount = 0;

  for (const { move, isPlayerMove } of moves) {
    if (isPlayerMove) {
      playerHand = applyMove(playerHand, move);
    } else {
      opponentHand = applyMove(opponentHand, move);
    }

    // Track pass count and last move
    if (move.type === 'PASS' /* HandType.PASS */) {
      passCount++;
    } else {
      lastMove = move;
      passCount = 0;
    }
  }

  return { playerHand, opponentHand, lastMove, passCount };
}
```

### Pattern 3: Optimal Path Extraction for Simulation

**What:** Extract the sequence of moves that represents the optimal play path through the tree.
**When to use:** SIM-01 (step-by-step mode walks through optimal play sequence).

```typescript
// For each player move: pick the win child.
// For each opponent move: show ALL children (opponent's options),
//   but the "optimal" path follows... what exactly?
//
// Key insight: The tree represents ALL possible plays.
// The "optimal path" is:
//   - Player moves: always pick the child with result === 'win'
//   - Opponent moves: pick ANY child (show all as options)
//
// For simulation, we need to pick ONE path through opponent moves.
// Best choice: the opponent's "best defense" -- the child with
// result === 'loss' (if any) or 'unknown'. If all children are
// 'win', the player wins regardless; pick the first child.
//
// For SIM-03, display ALL opponent children at each opponent step.

function extractOptimalPath(tree: TreeNode): TreeNode[] {
  const path: TreeNode[] = [];
  let current = tree;

  while (current.children.length > 0) {
    if (current.children[0]?.isPlayerMove) {
      // Player's turn: pick a winning move
      const winChild = current.children.find(c => c.result === 'win');
      if (winChild) {
        path.push(winChild);
        current = winChild;
      } else {
        break; // No winning move found (shouldn't happen for winnable positions)
      }
    } else {
      // Opponent's turn: show all options, default to first (or strongest defense)
      path.push(current.children[0]);
      current = current.children[0];
    }
  }

  return path;
}
```

### Pattern 4: Simulation View with AnimatePresence

**What:** Animate step transitions using framer-motion AnimatePresence.
**When to use:** SIM-01 step transitions when advancing/going back.

```typescript
// SimulationView.tsx -- animation pattern
import { motion, AnimatePresence } from 'framer-motion';

// Slide direction based on navigation
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 200 : -200,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -200 : 200,
    opacity: 0,
  }),
};

// In the component:
<AnimatePresence initial={false} custom={direction} mode="wait">
  <motion.div
    key={currentStep}
    custom={direction}
    variants={variants}
    initial="enter"
    animate="center"
    exit="exit"
    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
  >
    <StepDisplay step={steps[currentStep]} />
  </motion.div>
</AnimatePresence>
```

### Anti-Patterns to Avoid
- **Storing full game state in every TreeNode**: Would bloat memory for large trees. Instead, reconstruct on demand from the move path.
- **Recomputing dagre layout on every expand/collapse**: Only recompute layout for the visible subtree. Use React Flow's `hidden` property to toggle node visibility without removing nodes from the array.
- **Defining `nodeTypes` inside the component**: React Flow re-creates node type mappings on every render if the object is new. Always define `nodeTypes` as a constant outside the component.
- **Re-rendering all nodes when one is selected**: Use React Flow's `onNodeClick` with localized state updates. Only update the selected node's data, not the entire node array.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tree layout algorithm | Custom recursive positioning | dagre | dagre handles proper spacing, avoids node overlap, supports rank-based layout. Custom tree positioning always has edge cases (variable-width subtrees, overlapping branches). |
| Canvas/DOM virtualization | Custom viewport culling | React Flow (built-in) | React Flow only renders nodes in the viewport. Custom virtualization is complex and error-prone. |
| Pan/zoom/selection | Custom touch/mouse handlers | React Flow (built-in) | React Flow handles mouse, touch, and wheel events with momentum, bounding, and selection. |
| Animation sequencing | Manual requestAnimationFrame | framer-motion | framer-motion handles spring physics, orchestration, and interruptible animations. |
| CSS transition choreography | setTimeout chains | framer-motion staggerChildren | Complex multi-element animations need proper orchestration, not timing hacks. |

## Common Pitfalls

### Pitfall 1: TreeNode Path Indexing for State Reconstruction
**What goes wrong:** The tree is a recursive structure with no unique IDs. To reconstruct state at any node, you need to know the path from root to that node. If the path indices are wrong, the reconstructed state is wrong.
**Why it happens:** React Flow nodes are flat arrays; the tree is nested. Mapping between them requires a stable addressing scheme.
**How to avoid:** Use a dot-separated path string (e.g., "0.2.1") as the React Flow node ID. The path encodes the child index at each level. To reconstruct state, walk the tree following these indices.
**Warning signs:** Card counts in the detail panel don't match what the solver explored.

### Pitfall 2: Expand/Collapse with dagre Layout
**What goes wrong:** Collapsing a subtree hides nodes but the layout still allocates space for them, leaving gaps. Or re-running dagre on every expand/collapse is slow for large trees.
**Why it happens:** dagre positions ALL nodes including hidden ones, or you need to re-run the full layout.
**How to avoid:** Two approaches: (1) Use `hidden: true` on React Flow nodes (they stay in the array but aren't rendered) and only run dagre on visible nodes. (2) Start with depth-1 expanded and expand on demand, re-running dagre only for the affected subtree.
**Warning signs:** Large empty gaps in the tree, or layout takes >100ms on expand.

### Pitfall 3: React Flow nodeTypes Object Identity
**What goes wrong:** If `nodeTypes` is defined inside the component body, React Flow treats it as a new object on every render, causing all nodes to unmount/remount.
**Why it happens:** React Flow uses reference equality on the `nodeTypes` object.
**How to avoid:** Define `nodeTypes` as a module-level constant, outside the component.
**Warning signs:** Nodes flicker on every state change, or performance degrades.

### Pitfall 4: Large Tree Performance
**What goes wrong:** A complex endgame with many branching moves can produce 500+ tree nodes. Converting all of them to React Flow nodes/edges and running dagre layout takes noticeable time.
**Why it happens:** dagre is synchronous and O(n log n) -- fine for 500 nodes but could block the main thread for 50-100ms.
**How to avoid:** Start with the tree collapsed to depth 2-3 (showing the first few moves). Expand on click. Use React Flow's built-in virtualization. Consider running dagre in a Web Worker if layout time exceeds 50ms.
**Warning signs:** UI freezes briefly after solve completes.

### Pitfall 5: Simulation Path Ambiguity for Opponent Moves
**What goes wrong:** The "optimal play sequence" is well-defined for the player (always pick the winning child), but for the opponent, multiple responses exist. The simulation needs to show ONE default path while also displaying all options (SIM-03).
**Why it happens:** The tree branches at opponent moves because the opponent has choices. The simulation must choose one path to walk while showing alternatives.
**How to avoid:** Default to the first opponent child (arbitrary) for the main simulation path. Display ALL opponent children as selectable alternatives at each opponent step. When the user clicks an alternative, re-route the simulation through that branch.
**Warning signs:** Simulation only shows one possible game, or user cannot explore alternative opponent responses.

### Pitfall 6: Root Node Handling
**What goes wrong:** The root TreeNode has `move: PASS` (a placeholder), `result: 'unknown'`, and `isPlayerMove: false`. It represents the initial game state before any move. If treated as a regular move, the display is confusing.
**Why it happens:** TreeBuilder.createRoot() creates a synthetic root node that doesn't correspond to an actual play.
**How to avoid:** Skip the root node in the simulation (start from its children). In the tree view, render the root as a special "start" node without a move label.
**Warning signs:** First step of simulation shows "PASS" or an empty move, confusing the user.

## Code Examples

### React Flow Custom Node with Handle Positions (Tree Layout)

```typescript
// TreeNodeComponent.tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { Node } from '@xyflow/react';

type TreeNodeNodeType = Node<{
  label: string;
  result: 'win' | 'loss' | 'unknown';
  isPlayerMove: boolean;
  move: any;
  hasChildren: boolean;
  expanded: boolean;
}, 'treeNode'>;

const resultColors = {
  win: 'border-green-500 bg-green-50',
  loss: 'border-red-400 bg-red-50',
  unknown: 'border-gray-300 bg-gray-50',
};

function TreeNodeComponent({ data, id }: NodeProps<TreeNodeNodeType>) {
  const borderColor = resultColors[data.result];

  return (
    <div className={`px-3 py-2 rounded-lg border-2 ${borderColor} min-w-[140px]`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="text-sm font-medium">{data.label}</div>
      <div className="text-xs text-gray-500">
        {data.isPlayerMove ? '我方' : '对方'}
      </div>
      {data.hasChildren && (
        <span className="text-xs text-gray-400">
          {data.expanded ? '[-]' : '[+]'}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}

// MUST be defined outside component
export const nodeTypes = { treeNode: TreeNodeComponent };
```

### Zustand Store Extension for Phase 3

```typescript
// Add to game-store.ts or create a separate visualization store
interface VisualizationState {
  // Tree view state
  activeTab: 'tree' | 'simulation';
  selectedNodeId: string | null;

  // Simulation state
  currentStepIndex: number;
  simulationPath: TreeNode[];  // pre-computed optimal path
  autoPlaying: boolean;
  autoPlaySpeed: number; // ms between steps

  // Actions
  setActiveTab: (tab: 'tree' | 'simulation') => void;
  selectNode: (nodeId: string | null) => void;
  setStep: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  startAutoPlay: () => void;
  stopAutoPlay: () => void;
  setSimulationPath: (path: TreeNode[]) => void;
}
```

### Tab-Based View Switching

```typescript
// ResultTabs.tsx
function ResultTabs({ activeTab, onTabChange }: {
  activeTab: 'tree' | 'simulation';
  onTabChange: (tab: 'tree' | 'simulation') => void;
}) {
  return (
    <div className="flex border-b border-gray-200 mb-4">
      <button
        className={cn(
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'tree'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700',
        )}
        onClick={() => onTabChange('tree')}
      >
        决策树
      </button>
      <button
        className={cn(
          'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'simulation'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700',
        )}
        onClick={() => onTabChange('simulation')}
      >
        逐步模拟
      </button>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reactflow` package | `@xyflow/react` | v12 (2024) | Import paths changed, API mostly same |
| dagre (original) | @dagrejs/dagre fork | 2024+ | Original dagre is unmaintained; fork is active |
| Tailwind v3 config file | Tailwind v4 CSS-first | v4 (2025) | No tailwind.config.js; use @theme in CSS |
| framer-motion v11 | framer-motion v12 | 2025 | React 19 support, improved tree shaking |

**Deprecated/outdated:**
- `reactflow` package: renamed to `@xyflow/react` in v12. Old package no longer updated.
- `dagre` 0.8.5: still works but consider `@dagrejs/dagre` 3.0 for better TypeScript support and maintenance.

## Open Questions

1. **How large can the tree realistically get?**
   - What we know: Endgame positions are 1-10 cards per hand. Simple positions (1-3 cards) produce 5-30 nodes. Medium positions (4-6 cards) produce 30-200 nodes. Complex positions (7-10 cards) could produce 200-1000+ nodes.
   - What's unclear: Upper bound on tree size for worst-case 10-card endgames.
   - Recommendation: Start with dagre. If trees exceed 500 nodes and layout is slow, switch to elkjs or implement lazy expansion (only expand 2 levels deep initially).

2. **Should the simulation support branching?**
   - What we know: SIM-03 requires showing opponent's possible responses. The user needs to see all options at each opponent step.
   - What's unclear: Should the user be able to CLICK an opponent response to branch the simulation? Or just display them as a list?
   - Recommendation: Display all opponent responses as a list with winning moves highlighted. Allow clicking an opponent response to re-route the simulation path. This is the most useful UX.

3. **Auto-play speed default**
   - What we know: SIM-04 requires auto-play. No speed specified in requirements.
   - What's unclear: What feels natural for a card game simulation.
   - Recommendation: Default 1500ms per step, with speed control (0.5x/1x/2x).

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond npm packages already verified)

All required tools (Node.js, npm, Vite, TypeScript) are already in use from Phases 1-2. No new CLI tools or runtime services are needed.

## Sources

### Primary (HIGH confidence)
- npm registry (verified 2026-04-03): @xyflow/react 12.10.2, framer-motion 12.38.0, dagre 0.8.5, elkjs 0.11.1, lucide-react 1.7.0
- Project source code: TreeNode interface (src/solver/types.ts), TreeBuilder (src/solver/tree.ts), solver API (src/solver/solver.ts), encoding utilities (src/solver/encoding.ts)
- CLAUDE.md: Stack specifications (@xyflow/react, framer-motion)

### Secondary (MEDIUM confidence)
- React Flow custom nodes pattern: well-established pattern in React Flow documentation and examples
- dagre layout integration with React Flow: documented in React Flow examples (reactflow.dev/examples/layout/dagre)
- framer-motion AnimatePresence: documented API, stable across v11-v12

### Tertiary (LOW confidence)
- Maximum tree size for DDZ endgames: estimated from search algorithm complexity, not empirically measured in this project. May need validation during development.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified on npm, peer dependencies compatible with React 19
- Architecture: HIGH - TreeNode structure and solver API are well-understood from source code analysis
- Game state reconstruction: HIGH - Algorithm is straightforward (replay moves, applyMove already exists)
- Pitfalls: MEDIUM - Based on known React Flow patterns and potential tree sizes, but not yet validated with real data in this project
- Layout performance: MEDIUM - dagre should handle 500 nodes fine, but not tested with actual DDZ endgame trees

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable libraries, unlikely to change significantly)
