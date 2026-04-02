# Architecture Research

**Domain:** Two-player Dou Di Zhu (斗地主) endgame solver — browser-based with Web Worker computation and React tree visualization
**Researched:** 2026-04-03
**Confidence:** MEDIUM (based on domain knowledge, existing research from STACK.md and PITFALLS.md)

---

## System Overview

```
┌─────────────────────────────────────────────────┐
│                   Main Thread (React)            │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ CardInput │  │TreeView  │  │ StepSimulator │  │
│  │  Page     │  │  Page    │  │    Page       │  │
│  └─────┬────┘  └────┬─────┘  └──────┬────────┘  │
│        │             │               │           │
│  ┌─────┴─────────────┴───────────────┴────────┐  │
│  │              Zustand Store                  │  │
│  │  (gameState, solverResult, uiState)        │  │
│  └──────────────────┬─────────────────────────┘  │
│                     │ Comlink RPC                 │
├─────────────────────┼────────────────────────────┤
│              Web Worker Thread                    │
│  ┌──────────────────┴─────────────────────────┐  │
│  │            Solver Engine                    │  │
│  │  ┌────────────┐  ┌─────────────────────┐   │  │
│  │  │ CardType   │  │ Minimax Search      │   │  │
│  │  │ Recognizer │  │ + Alpha-Beta        │   │  │
│  │  └────────────┘  │ + Transposition Tab │   │  │
│  │                  │ + Zobrist Hashing   │   │  │
│  │  ┌────────────┐  └─────────────────────┘   │  │
│  │  │ MoveGen   │                             │  │
│  │  │ (enum all │  ┌─────────────────────┐   │  │
│  │  │  legal    │  │ DecisionTree        │   │  │
│  │  │  plays)   │  │ Builder             │   │  │
│  │  └────────────┘  └─────────────────────┘   │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## Component Boundaries

### Layer 1: Solver Engine (Web Worker)

Pure computation, no DOM access. All types are serializable.

#### 1.1 GameState Module (`solver/game-state.ts`)

**Responsibility:** Immutable game state representation using bitmasks.

```
GameState = {
  hands: [Bitmask, Bitmask]    // 17-bit counters per player (1-15 values)
  currentPlayer: 0 | 1
  lastPlay: Play | null         // null = free play (leading)
  lastPlayer: number | null     // who played last (for pass detection)
}
```

**Bitmask encoding:**
- Each card value (1-15) has a 4-bit count (0-4 for regular, 0-1 for jokers)
- Total: ~60 bits per hand, fits in a single BigInt or two 32-bit ints
- Enables fast equality comparison and Zobrist hashing

**Key design decisions:**
- Immutable: every move produces a new GameState (no mutation)
- Canonical: same cards in different order = same state
- Hashable: Zobrist hash computed incrementally

#### 1.2 CardType Recognizer (`solver/card-types.ts`)

**Responsibility:** Given a set of cards, determine what hand type it forms.

Types to recognize:
| Hand Type | Chinese | Pattern |
|-----------|---------|---------|
| Single | 单牌 | 1 card |
| Pair | 对子 | 2 same value |
| Triple | 三条 | 3 same value |
| Triple+Single | 三带一 | 3+1 |
| Triple+Pair | 三带二 | 3+2 |
| Straight | 顺子 | 5+ consecutive (3-A only, no 2/jokers) |
| Consecutive Pairs | 连对 | 3+ consecutive pairs |
| Airplane | 飞机 | 2+ consecutive triples |
| Airplane+Singles | 飞机带单 | airplane + N singles |
| Airplane+Pairs | 飞机带对 | airplane + N pairs |
| Four+Two Singles | 四带二 | 4 same + 2 singles |
| Four+Two Pairs | 四带两对 | 4 same + 2 pairs |
| Bomb | 炸弹 | 4 same value |
| Rocket | 火箭 | both jokers |

**Edge cases to handle:**
- "2" (value 2) cannot appear in straights or consecutive patterns
- Rocket (小王+大王) is the highest play, beats everything including bombs
- Four-with-two is NOT a bomb (cannot beat bombs)
- Airplane wings must all be same type (all singles or all pairs)
- Bombs can be played out of turn (beat any non-bomb, non-rocket)

#### 1.3 Move Generator (`solver/move-gen.ts`)

**Responsibility:** Given a GameState, enumerate all legal plays for current player.

Two modes:
- **Leading (free play):** Enumerate all valid hand types from current hand
- **Following (beat last play):** Only plays that beat the last play (same type + higher, or bombs/rockets)

**Optimization:** Generate moves in priority order for better alpha-beta pruning:
1. Bombs and rockets first (strongest, most pruning)
2. Plays that reduce hand size fastest
3. Higher value plays before lower

#### 1.4 Solver Search (`solver/search.ts`)

**Responsibility:** Minimax search with alpha-beta pruning and transposition table.

```
solve(state, alpha, beta, maximizingPlayer):
  if terminal(state): return evaluation
  hash = zobristHash(state)
  if transpositionTable.has(hash): return cached result
  for each move in generateMoves(state):
    newState = applyMove(state, move)
    score = solve(newState, alpha, beta, !maximizingPlayer)
    update alpha/beta
    if cutoff: break
  transpositionTable.set(hash, result)
  return result
```

**Transposition table:**
- Key: Zobrist hash (64-bit)
- Value: { score, depth, bestMove, flag (exact/lower/upper) }
- Size limit with replacement policy (keep deeper entries)

**Time budget:** 10 seconds max, return best partial result.

#### 1.5 Decision Tree Builder (`solver/tree-builder.ts`)

**Responsibility:** Build the complete winning decision tree during search.

```
DecisionNode = {
  state: GameState
  myPlay: Play               // what I play here
  opponentResponses: {        // for each possible opponent response:
    opponentPlay: Play
    myNextPlay: DecisionNode  // my counter-response
  }[]
}
```

Only store winning paths — prune branches where opponent can force a loss.

### Layer 2: Web Worker Bridge (`worker/`)

#### 2.1 Worker Entry (`worker/solver-worker.ts`)

Uses Comlink to expose the solver API to the main thread:

```
SolverWorker API:
  - solve(request: SolveRequest): Promise<SolveResult>
  - solveWithTree(request: SolveRequest): Promise<SolveResultWithTree>
  - cancel(): void
```

#### 2.2 Message Protocol

```
SolveRequest = {
  myHand: number[]       // card values
  opponentHand: number[]
  firstPlayer: 0 | 1
  timeLimitMs: number    // default 10000
}

SolveResult = {
  canWin: boolean
  bestMove: Play | null
  searchStats: {
    nodesExplored: number
    transpositionHits: number
    timeMs: number
  }
}

SolveResultWithTree = SolveResult & {
  decisionTree: DecisionNode   // only if canWin = true
}
```

### Layer 3: React Application (`src/`)

#### 3.1 State Management (`src/store/`)

Zustand store with three slices:

```
GameStore = {
  // Input state
  myHand: number[]
  opponentHand: number[]
  firstPlayer: 0 | 1

  // Solver state
  solveStatus: 'idle' | 'solving' | 'done' | 'error'
  solveResult: SolveResult | null
  decisionTree: DecisionNode | null

  // UI state
  viewMode: 'input' | 'tree' | 'simulation'
  selectedTreeNode: string | null
  simulationStep: number
}
```

#### 3.2 Pages

| Page | Route | Purpose |
|------|-------|---------|
| InputPage | `/` | Card input form with visual card picker |
| ResultPage | `/result` | Split view: tree + simulation |
| (could be single page with tabs) | | |

#### 3.3 Components

```
src/
├── components/
│   ├── card/
│   │   ├── Card.tsx          # Single playing card visual
│   │   ├── CardHand.tsx      # Display a hand of cards
│   │   └── CardPicker.tsx    # Interactive card selection UI
│   ├── input/
│   │   ├── HandInput.tsx     # Input form for both hands
│   │   └── FirstPlayerSelect.tsx
│   ├── tree/
│   │   ├── DecisionTreeView.tsx    # React Flow tree
│   │   ├── TreeNode.tsx           # Custom tree node component
│   │   └── TreeEdge.tsx          # Custom edge with play label
│   ├── simulation/
│   │   ├── StepSimulator.tsx      # Step-by-step play viewer
│   │   ├── PlayHistory.tsx        # List of past plays
│   │   └── SimulationControls.tsx # Next/prev/auto-play
│   └── layout/
│       ├── Header.tsx
│       ├── TabBar.tsx             # Switch tree/simulation views
│       └── StatusBar.tsx          # Solver progress
├── store/
│   └── gameStore.ts
├── solver/
│   └── solverApi.ts         # Comlink wrapper
├── types/
│   └── game.ts              # Shared types
└── App.tsx
```

---

## Data Flow

### Solve Flow

```
User inputs cards → Store updates hands
User clicks "Solve" → Store sets status=solving
                      → Comlink calls worker.solve()
                      → Worker runs Minimax search
                      → Progress updates via Comlink callback
                      → Worker returns SolveResult + DecisionTree
Store updates result → Store sets status=done
UI renders tree/simulation from store
```

### Tree Interaction Flow

```
User clicks tree node → Store updates selectedTreeNode
                      → Simulation syncs to corresponding step
                      → Card hand displays update
```

### Simulation Flow

```
User clicks "Next" → Store advances simulationStep
                   → Current play + hands display update
                   → If opponent's turn: auto-show all responses
                   → If my turn: highlight winning move
```

---

## Build Order (Dependency Chain)

```
Phase 1: Core Solver (no UI)
  ├── Card type definitions (types/game.ts)
  ├── Game state module (solver/game-state.ts)
  ├── Card type recognizer (solver/card-types.ts)  ← needs types
  ├── Move generator (solver/move-gen.ts)          ← needs card-types + game-state
  ├── Minimax solver (solver/search.ts)            ← needs move-gen + game-state
  └── Comprehensive unit tests for all of the above

Phase 2: UI + Worker Integration
  ├── Project scaffolding (Vite + React + TailwindCSS)
  ├── Web Worker setup with Comlink
  ├── Card input UI (visual card picker)
  ├── Basic solve flow (input → solve → display result)
  └── Playing card visual components

Phase 3: Visualization
  ├── Decision tree visualization (React Flow)
  ├── Step-by-step simulation mode
  ├── View switching (tree ↔ simulation)
  └── Polish: animations, responsive layout
```

---

## Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| State representation | Bitmask per card value | Fast comparison, Zobrist hashing, immutable by design |
| Search algorithm | Minimax + Alpha-Beta + Transposition | Standard for two-player zero-sum games; transposition table critical for DDZ |
| Worker communication | Comlink | Type-safe RPC, eliminates postMessage boilerplate |
| Tree visualization | React Flow | Rich custom node rendering needed for cards |
| State management | Zustand | Simple, minimal boilerplate, works well with Worker async patterns |
| View architecture | Single page with tabs | Simple navigation, no routing needed for 3 views |
