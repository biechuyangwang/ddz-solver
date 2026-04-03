# Phase 2: Interactive App + Worker - Research

**Researched:** 2026-04-03
**Domain:** React 19 SPA with Web Worker solver integration, visual card input UI, Chinese-language interface
**Confidence:** HIGH

## Summary

Phase 2 transforms the Phase 1 solver engine (pure TypeScript library in `src/solver/`) into an interactive web application. The key technical challenges are: (1) scaffolding a Vite + React + Tailwind v4 project around existing solver code, (2) wrapping the synchronous `solve()` function in a Web Worker with Comlink for non-blocking UI, (3) implementing a click-to-select card picker for a 54-card DDZ deck, and (4) displaying solver results with Chinese-language UI.

The solver API is already well-defined: `solve(playerHand: number[], opponentHand: number[], options?: SolverOptions)` returns `SolverResult { winnable, bestMove, tree, stats }`. The solver is synchronous and CPU-bound, making Worker offloading mandatory. The solver already supports time budgets (default 10s) and node counting, which map directly to the progress and cancellation requirements.

**Primary recommendation:** Scaffold the Vite project first, then build bottom-up: Worker wrapper around solver -> state management (zustand) -> card input components -> result display. Keep the solver module untouched in `src/solver/` and import it from the Worker.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CARD-01 | Visual card picker (click-to-select from full deck) | Card UI architecture section: suit/value grid, selection state tracking |
| CARD-02 | Cards displayed with suit symbols and face values (visual poker cards) | Card rendering section: Unicode suit symbols, CSS card styling patterns |
| CARD-03 | User selects first/second player (default: user goes first) | State management section: `firstPlayerIsUser` in zustand store |
| CARD-04 | Clear/reset input with undo support | State management section: undo via history stack or card removal by click |
| CARD-05 | Input validation (max 4 per value, no cross-hand duplication) | Validation logic section: deck tracking with remaining counts |
| WORK-01 | Solver runs in Web Worker via Comlink (non-blocking UI) | Worker architecture section: Comlink expose/wrap pattern with Vite |
| WORK-02 | Progress indicator during computation | Worker section: progress callbacks via Comlink proxy, node count polling |
| WORK-03 | User can cancel in-progress solve | Worker section: termination-based cancellation with Worker.terminate() |
| RSLT-01 | Clear win/lose result with "必胜" badge | Result display section: conditional rendering from SolverResult.winnable |
| RSLT-02 | Search statistics (nodes, time, transposition hits) | Result display section: SearchStats type already defined in types.ts |
| RSLT-04 | Chinese language UI (English only for technical terms) | i18n section: all UI strings in Chinese, statistics labels strategy |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.4 | UI framework | User-specified. React 19 stable with improved concurrent features. |
| react-dom | 19.2.4 | React DOM renderer | Required peer for React. |
| vite | 8.0.3 | Build tool / dev server | User-specified. Fast HMR, native ESM, built-in Worker support. |
| typescript | 6.0.2 | Type safety | User-specified. Already in project at ^5.8.0; upgrade to 6.x per CLAUDE.md recommendation. |
| tailwindcss | 4.2.2 | Styling | User-specified. v4 uses CSS-first config, no config file needed. |
| @tailwindcss/vite | 4.2.2 | Tailwind v4 Vite plugin | Required for Tailwind v4 integration. Replaces PostCSS approach. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| comlink | 4.4.2 | Web Worker RPC abstraction | Wrapping solver Worker. Eliminates postMessage boilerplate. |
| vite-plugin-comlink | 5.3.0 | Vite plugin for Comlink | Handles Worker bundling so you import solver as a normal module. |
| zustand | 5.0.12 | Client state management | App state: card selections, solver status, results, UI mode. |
| @vitejs/plugin-react | 6.0.1 | React Fast Refresh in Vite | Required for HMR with React components. |
| clsx | 2.1.1 | Conditional CSS class composition | Card selected states, suit color classes, button states. |
| tailwind-merge | 3.5.0 | Tailwind class conflict resolution | Composing card component styles without specificity bugs. |

### Not Needed for Phase 2 (Deferred to Phase 3)
| Library | Why Deferred |
|---------|-------------|
| @xyflow/react | Decision tree visualization -- Phase 3 requirement |
| framer-motion | Card animations -- nice-to-have, not required by any Phase 2 req |
| elkjs | Tree layout -- Phase 3 |
| lucide-react | Icons -- can use Unicode characters for Phase 2's simpler UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-comlink | Raw Worker + postMessage | More boilerplate, manual type casting, but no plugin dependency. Plugin is simpler. |
| zustand | React Context + useReducer | More boilerplate for the same result. Zustand is cleaner for multi-component shared state. |
| clsx + tailwind-merge | cn() helper (shadcn pattern) | cn() is literally clsx + tailwind-merge wrapped. Same thing, different packaging. |

**Installation:**
```bash
# Core dependencies
npm install react@19.2.4 react-dom@19.2.4

# Tailwind v4 (Vite plugin approach -- no PostCSS needed)
npm install -D tailwindcss@4.2.2 @tailwindcss/vite@4.2.2

# Vite (upgrade from existing)
npm install -D vite@8.0.3 @vitejs/plugin-react@6.0.1

# Web Worker + Comlink
npm install comlink@4.4.2
npm install -D vite-plugin-comlink@5.3.0

# State management
npm install zustand@5.0.12

# Styling utilities
npm install clsx@2.1.1 tailwind-merge@3.5.0

# TypeScript upgrade
npm install -D typescript@6.0.2
```

**Version verification:** All versions verified via `npm view` on 2026-04-03:
- react: 19.2.4, react-dom: 19.2.4, vite: 8.0.3, typescript: 6.0.2
- tailwindcss: 4.2.2, @tailwindcss/vite: 4.2.2
- comlink: 4.4.2, vite-plugin-comlink: 5.3.0
- zustand: 5.0.12, @vitejs/plugin-react: 6.0.1
- clsx: 2.1.1, tailwind-merge: 3.5.0

## Architecture Patterns

### Recommended Project Structure
```
src/
├── solver/              # Phase 1 - UNTOUCHED, imported by Worker
│   ├── types.ts
│   ├── solver.ts        # solve() - the main entry point
│   ├── encoding.ts
│   ├── constants.ts
│   ├── hand-types.ts
│   ├── move-gen.ts
│   ├── search.ts
│   ├── transposition.ts
│   ├── tree.ts
│   └── utils.ts
├── worker/              # Web Worker wrapper
│   └── solver-worker.ts # Comlink-exposed solver API
├── store/               # Zustand state management
│   └── game-store.ts    # Single store for game state
├── components/          # React components
│   ├── CardPicker.tsx    # Full deck card grid with selection
│   ├── HandDisplay.tsx   # Shows selected cards for one player
│   ├── PlayerPanel.tsx   # Card picker + hand display for one player
│   ├── SolveButton.tsx   # Solve trigger + progress + cancel
│   └── ResultPanel.tsx   # Win/lose result + statistics
├── lib/                 # Utility functions
│   └── card-utils.ts    # Card display helpers (suit, value, Chinese names)
├── App.tsx              # Main app layout
├── main.tsx             # React entry point
└── index.css            # Tailwind v4 entry (@import "tailwindcss")
```

### Pattern 1: Comlink Worker Wrapper
**What:** Expose the solver's `solve()` function through a Web Worker using Comlink, adding cancellation and progress reporting.
**When to use:** All solver invocations from the UI.

```typescript
// src/worker/solver-worker.ts
import { expose } from 'comlink';
import { solve } from '../solver/solver.js';
import type { SolverOptions, SolverResult } from '../solver/types.js';

const solverApi = {
  solve(
    playerHand: number[],
    opponentHand: number[],
    options?: SolverOptions,
  ): SolverResult {
    return solve(playerHand, opponentHand, options);
  },
};

expose(solverApi);
export type SolverWorkerApi = typeof solverApi;
```

**Main thread usage:**
```typescript
// In component or store action
import { wrap } from 'comlink';
import type { SolverWorkerApi } from '../worker/solver-worker';

const worker = new Worker(
  new URL('../worker/solver-worker.ts', import.meta.url),
  { type: 'module' }
);
const api = wrap<SolverWorkerApi>(worker);

// Non-blocking call
const result = await api.solve(playerCards, opponentCards, { firstPlayerIsUser });
worker.terminate(); // Clean up after use
```

### Pattern 2: Zustand Store for Game State
**What:** Single zustand store managing card selections, solver state, and results.
**When to use:** All shared state across components.

```typescript
// src/store/game-store.ts
import { create } from 'zustand';
import type { SolverResult, SearchStats } from '../solver/types';

interface GameState {
  // Card input
  playerCards: number[];    // Card values selected for player
  opponentCards: number[];  // Card values selected for opponent
  firstPlayerIsUser: boolean;

  // Solver state
  status: 'idle' | 'solving' | 'done' | 'error';
  result: SolverResult | null;

  // Actions
  addCard: (target: 'player' | 'opponent', cardValue: number) => void;
  removeCard: (target: 'player' | 'opponent', cardValue: number) => void;
  clearAll: () => void;
  setFirstPlayer: (isUser: boolean) => void;
  startSolving: () => void;
  setResult: (result: SolverResult) => void;
  cancelSolving: () => void;
  reset: () => void;
}
```

### Pattern 3: Card Picker Component
**What:** Grid-based card selection UI showing all 54 cards, with click-to-select behavior.
**When to use:** CARD-01, CARD-02 card input.

```typescript
// Card value/suit constants for display
const SUITS = ['spade', 'heart', 'club', 'diamond'] as const;
const SUIT_SYMBOLS = { spade: '\u2660', heart: '\u2665', club: '\u2663', diamond: '\u2666' };
const FACE_VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
// Jokers: Small=14, Big=15 -- displayed separately, no suit
```

### Pattern 4: Cancellation via Worker Termination
**What:** For WORK-03 cancellation, terminate the Worker entirely.
**When to use:** When user clicks cancel during solving.

The simplest and most reliable approach for cancellation is `worker.terminate()`. This immediately kills the Worker thread. The tradeoff is that the Worker must be re-created for subsequent solves, but since the solver is stateless (no persistent state between solves), this has zero cost.

```typescript
// In zustand store or a hook
let currentWorker: Worker | null = null;

function startSolving() {
  currentWorker = new Worker(
    new URL('../worker/solver-worker.ts', import.meta.url),
    { type: 'module' }
  );
  const api = wrap<SolverWorkerApi>(currentWorker);
  // ... await result
}

function cancelSolving() {
  if (currentWorker) {
    currentWorker.terminate();
    currentWorker = null;
  }
}
```

### Pattern 5: Progress Indicator (WORK-02)
**What:** Show solver progress during computation.
**When to use:** While solver is running (status === 'solving').

The solver already checks time budget every 10,000 nodes. For progress reporting, two approaches:

**Approach A -- Indeterminate progress (RECOMMENDED for Phase 2):**
Show a spinner or pulsing "求解中..." text. The solver does not report incremental progress in its current form, and adding progress callbacks requires modifying the solver internals (which should stay untouched). Given the solver targets <10s for endgames, an indeterminate indicator is sufficient.

**Approach B -- Time-based progress estimate:**
Show elapsed time with a note like "已用时 Xs / 10s 预算". This gives the user a sense of progress without requiring solver modifications.

### Anti-Patterns to Avoid
- **Don't modify solver code to add progress hooks:** The solver in `src/solver/` is a pure computation module. Adding UI concerns (progress callbacks, AbortSignal) pollutes the clean separation. Instead, use Worker termination for cancellation and time-based display for progress.
- **Don't run solver on main thread:** Even for small endgames, the solver is CPU-bound synchronous code. It WILL freeze the UI. Always use the Worker.
- **Don't build a custom card rendering engine:** Use Tailwind utilities for card styling. CSS grid for the card picker layout. Unicode suit symbols for display. No canvas or SVG needed.
- **Don't use React Context for game state:** Multiple components need coordinated access to card selections and solver state. Zustand is simpler and more performant than Context + useReducer for this use case.
- **Don't create Tailwind config file:** Tailwind v4 uses CSS-first config with `@theme` directive. A `tailwind.config.js` file will be ignored by v4.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Worker message passing | Custom postMessage protocol | Comlink expose/wrap | Type-safe, no serialization bugs, clean API |
| State management | React Context + complex useReducer | zustand | Less boilerplate, no provider nesting, built-in selectors |
| Tailwind class conflicts | Manual string concatenation | clsx() + tailwind-merge() | Handles conditional classes and conflicting utilities correctly |
| CSS preprocessing | PostCSS + autoprefixer + config files | @tailwindcss/vite plugin | Tailwind v4 handles everything natively in Vite |
| Suit symbol rendering | SVG suit icons | Unicode characters | U+2660-U+2666 cover all four suits, zero dependency, perfect rendering |

**Key insight:** This phase is fundamentally about gluing an existing computation engine to a UI. The solver is done. The work is scaffolding, state management, and component rendering. Don't over-engineer any of these.

## Common Pitfalls

### Pitfall 1: Vite Worker Import Path
**What goes wrong:** Worker files imported with wrong path syntax fail silently or throw "Failed to load worker script" errors.
**Why it happens:** Vite requires `new URL('./worker.ts', import.meta.url)` syntax for Worker imports, not plain string paths. With `vite-plugin-comlink`, this must still be used alongside Comlink's `wrap()`.
**How to avoid:** Always use the URL constructor pattern for Worker instantiation. The plugin handles bundling but not instantiation.
**Warning signs:** "Failed to fetch dynamically imported module" or worker never responds.

### Pitfall 2: Tailwind v4 Config Mismatch
**What goes wrong:** Creating a `tailwind.config.js` file that v4 ignores, or using old `@tailwind base; @tailwind components; @tailwind utilities;` directives.
**Why it happens:** Tailwind v4 changed its configuration approach. Many tutorials and AI suggestions still reference v3 patterns.
**How to avoid:** Use `@import "tailwindcss";` in CSS. Use `@theme` for custom values. Add `@tailwindcss/vite` to Vite plugins. Do NOT create any Tailwind config file.
**Warning signs:** Tailwind classes have no effect; `@tailwind` directives produce warnings.

### Pitfall 3: Solver Type Import in Worker
**What goes wrong:** Worker cannot import from `../solver/types.js` because the path resolution differs in Worker context, or because `.js` extensions don't match the actual `.ts` files during development.
**Why it happens:** Vite's Worker bundling uses different resolution than the main bundle. With `vite-plugin-comlink`, the plugin should handle this, but the import paths must use `.js` extensions (TypeScript ESM convention) consistently.
**How to avoid:** The solver files already use `.js` extensions in imports (verified in solver.ts: `import type { ... } from './types.js'`). Keep this convention. Verify Worker bundling works during the scaffold task.
**Warning signs:** Worker crashes immediately with "Cannot find module" errors.

### Pitfall 4: Card Selection State Desync
**What goes wrong:** Selected card count doesn't match deck availability. Same card appears in both player's hands. More than 4 of a value selected across both hands.
**Why it happens:** Without a single source of truth for "remaining cards in deck," two independent card arrays can diverge.
**How to avoid:** Maintain a `deckAvailability: number[15]` (4 per value for 1-13, 1 each for 14/15) in the store. Derive it from both hands' selections. Disable cards in the picker when availability reaches 0.
**Warning signs:** Cards clickable when they shouldn't be; total card count exceeds 54.

### Pitfall 5: TypeScript JSX Configuration
**What goes wrong:** React components fail to compile because `tsconfig.json` doesn't have JSX settings.
**Why it happens:** The current `tsconfig.json` has no `jsx` setting (it was a pure TS library project).
**How to avoid:** Add `"jsx": "react-jsx"` to `compilerOptions` in tsconfig.json. This enables the automatic JSX runtime that React 19 uses.
**Warning signs:** "Cannot JSX elements because tsconfig 'jsx' flag is not set" errors.

### Pitfall 6: Blocking the Main Thread After Solve
**What goes wrong:** Solver result includes a large decision tree (potentially thousands of TreeNode objects). Transferring this from Worker to main thread via Comlink's structured clone can cause a noticeable freeze for large trees.
**Why it happens:** Structured clone of deeply nested objects is not free. For a tree with 5000+ nodes, the serialization can take 100ms+.
**How to avoid:** For Phase 2, the tree is not visualized (that's Phase 3), so consider stripping the tree from the result in the Worker if it's very large, or accepting the small transfer cost. The result is only needed for winnable/bestMove/stats in Phase 2.
**Warning signs:** Brief UI freeze after solve completes.

## Code Examples

### Vite Config for Phase 2
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import comlink from 'vite-plugin-comlink';

export default defineConfig({
  plugins: [
    comlink(),
    react(),
    tailwindcss(),
  ],
  worker: {
    plugins: () => [comlink()],
  },
});
```

### CSS Entry for Tailwind v4
```css
/* src/index.css */
@import "tailwindcss";

/* Custom theme values for card game */
@theme {
  --color-card-bg: #ffffff;
  --color-card-selected: #3b82f6;
  --color-suit-red: #dc2626;
  --color-suit-black: #1f2937;
}
```

### Card Display Utilities
```typescript
// src/lib/card-utils.ts
export const SUIT_SYMBOLS: Record<string, string> = {
  spade: '\u2660',   // ♠
  heart: '\u2665',   // ♥
  club: '\u2663',    // ♣
  diamond: '\u2666', // ♦
};

export const VALUE_DISPLAY: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
  14: '小王', // Small Joker
  15: '大王', // Big Joker
};

export function isRedSuit(suit: string): boolean {
  return suit === 'heart' || suit === 'diamond';
}

// Max count per card value: 4 for values 1-13, 1 for jokers 14/15
export function maxCountForValue(value: number): number {
  return value >= 14 ? 1 : 4;
}
```

### Card Picker Component Sketch
```typescript
// src/components/CardPicker.tsx
// The full deck is organized as:
// - 4 rows for regular cards (one per suit), 13 columns (A through K)
// - 1 row for jokers (2 cards)
// Each card shows: suit symbol + face value
// Cards grayed out / disabled when max count reached across both hands
// Click increments count for the target player's hand
```

### Solver Worker Hook Pattern
```typescript
// Custom hook or store action for solver interaction
// 1. Create Worker on solve click
// 2. Wrap with Comlink
// 3. Await result
// 4. Store result in zustand
// 5. Terminate worker (or keep alive for cancellation check)
```

### Result Display Pattern
```typescript
// Conditional rendering based on SolverResult
// winnable === true:
//   "必胜" badge (green, prominent)
//   Best move: show card names in Chinese
// winnable === false:
//   "无必胜策略" text (neutral)
// Stats always shown:
//   搜索节点数: {nodesExplored}
//   用时: {timeMs}ms
//   置换表命中: {transpositionHits}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 config file | Tailwind v4 CSS-first `@theme` | 2025 (Tailwind v4 release) | No `tailwind.config.js`, no PostCSS, use `@import "tailwindcss"` |
| Vite Worker string paths | `new URL(..., import.meta.url)` + plugin bundling | Vite 5+ | Reliable Worker bundling with full ESM support |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` | Tailwind v4 | Single directive replaces three |
| React 18 createRoot | React 19 createRoot (same API) | React 19 release | No API change needed, but types improved |

**Deprecated/outdated:**
- `tailwind.config.js`: Ignored by Tailwind v4. Use `@theme` in CSS instead.
- `@tailwindcss/postcss`: Replaced by `@tailwindcss/vite` for Vite projects.
- `postcss` + `autoprefixer`: No longer needed for Tailwind v4 in Vite projects.

## Chinese UI String Reference

All visible UI text must be in Chinese. Here are the standard strings for this phase:

| UI Element | Chinese Text |
|------------|-------------|
| App title | 斗地主残局求解器 |
| Player hand label | 我方手牌 |
| Opponent hand label | 对方手牌 |
| Card picker instruction | 点击选择手牌 |
| First player toggle | 先手 / 后手 |
| Solve button (idle) | 开始求解 |
| Solve button (solving) | 求解中... |
| Cancel button | 取消 |
| Clear button | 清空 |
| Reset button | 重置 |
| Win result badge | 必胜 |
| Lose result text | 无必胜策略 |
| Stats: nodes | 搜索节点数 |
| Stats: time | 用时 |
| Stats: TT hits | 置换表命中 |
| Best move label | 最佳出牌 |
| Joker names | 小王 (14), 大王 (15) |
| Suit names (if needed) | 黑桃 ♠, 红心 ♥, 梅花 ♣, 方块 ♦ |

## Open Questions

1. **TypeScript 6.0 compatibility with existing solver code**
   - What we know: Current `tsconfig.json` targets ES2022 with `module: "ESNext"`. TypeScript 6.0 was just released.
   - What's unclear: Whether any breaking changes in TS 6.0 affect the solver's type patterns (enum, type assertions, etc.).
   - Recommendation: Upgrade TypeScript as part of the Vite scaffold. Run existing solver tests to verify nothing breaks. If tests fail, pin to 5.8.x which is known working.

2. **vite-plugin-comlink 5.3.0 compatibility with Vite 8**
   - What we know: Plugin peer dependency lists Vite 5+. Vite 8 is the latest.
   - What's unclear: Whether Vite 8 introduced Worker API changes that break the plugin.
   - Recommendation: Try it during scaffolding. If it fails, fall back to manual Comlink setup (no plugin, use `new URL()` + `wrap()` directly -- the plugin is a convenience, not a requirement).

3. **Card picker UX: click-to-increment vs. click-to-assign**
   - What we know: The picker needs to support adding cards to either player's hand. Two approaches: (A) show one picker that assigns to the "active" player, or (B) show two separate pickers, one per player.
   - What's unclear: Which UX is cleaner for the user.
   - Recommendation: Use a single deck display with a player toggle. Show two hand displays (one per player) below the deck. Clicking a card in the deck adds it to the currently selected player's hand. This is cleaner than two separate deck grids.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vite, npm scripts | Assumed | -- | -- |
| npm | Package management | Assumed | -- | -- |
| Chrome/Edge browser | App runtime | Assumed | -- | -- |

**This phase has no external service dependencies.** All computation is client-side. The only external dependency is npm for package installation.

## Sources

### Primary (HIGH confidence)
- npm registry (via `npm view`) -- All package versions verified directly on 2026-04-03
- Project source code in `src/solver/` -- Solver API, types, and encoding reviewed directly
- CLAUDE.md Technology Stack section -- Pre-researched stack recommendations with version pinning

### Secondary (MEDIUM confidence)
- Tailwind v4 CSS-first configuration patterns -- Based on training data and CLAUDE.md documentation
- Comlink + vite-plugin-comlink Worker setup pattern -- Based on training data, verified npm versions
- zustand 5.x store patterns -- Based on training data, verified npm version 5.0.12

### Tertiary (LOW confidence)
- vite-plugin-comlink 5.3.0 compatibility with Vite 8 -- Not verified against release notes. Plugin lists Vite 5+ as peer dep. May need manual Comlink setup as fallback.
- TypeScript 6.0 breaking changes relative to 5.8 -- Not verified. May need to pin 5.8.x.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry, stack specified by user in CLAUDE.md
- Architecture: HIGH - Clear separation of concerns (Worker/state/components), well-established React patterns
- Pitfalls: HIGH - Based on direct experience with Vite + Tailwind v4 + Worker integration patterns
- Card UI: MEDIUM - DDZ card picker UX is project-specific, no standard reference implementation

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack, low churn expected)
