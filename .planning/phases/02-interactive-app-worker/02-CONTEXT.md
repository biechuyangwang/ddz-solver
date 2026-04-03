# Phase 2: Interactive App + Worker - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can input both players' hands through a visual card picker, trigger the solver in a Web Worker, and see the win/lose result with search statistics — all in a Chinese-language web interface. No tree visualization or step simulation (those are Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Card Input (CARD-01 through CARD-05)
- **D-01:** Visual card picker — click-to-select from a full 54-card deck displayed as poker-style cards with suit symbols and face values
- **D-02:** Two hand areas: player hand (left/top) and opponent hand (right/bottom). Clicking a card in the picker adds it to the active hand. Clicking a card in a hand removes it back to the picker.
- **D-03:** First/second player selector (default: user goes first) via toggle or radio buttons
- **D-04:** Clear/reset button to remove all selections. Undo support for last action.
- **D-05:** Input validation: max 4 of each card value across both hands combined, no duplicates between hands, visual error state for violations

### Card Display Style
- **D-06:** Cards displayed as visual poker cards with suit symbols (♠♥♦♣) and face values (A-K, 小王/大王)
- **D-07:** Card color: red for hearts/diamonds, black for spades/clubs. Jokers in special color.
- **D-08:** Compact layout suitable for both desktop and mobile viewing

### Web Worker Integration (WORK-01 through WORK-03)
- **D-09:** Solver runs in Web Worker via Comlink (non-blocking UI)
- **D-10:** Progress indicator shows solver status during computation
- **D-11:** Cancel button allows user to abort in-progress solve
- **D-12:** Solver wraps the Phase 1 `solve()` function — same input/output contract

### Result Display (RSLT-01, RSLT-02, RSLT-04)
- **D-13:** Clear win/lose result with "必胜" (guaranteed win) badge for winning positions
- **D-14:** Flat "无法必胜" message for unwinnable positions (per Phase 1 D-04)
- **D-15:** Search statistics displayed: nodes explored, time elapsed, transposition table hits
- **D-16:** Entire UI in Chinese language, English acceptable only for technical terms in statistics

### Claude's Discretion
- Exact card picker grid layout and card component sizing
- Specific React component structure and state management approach
- Worker setup details and Comlink configuration
- Error state styling and empty state design
- Animation/transition details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Solver Integration
- `.planning/REQUIREMENTS.md` — CARD-01 through CARD-05, WORK-01 through WORK-03, RSLT-01, RSLT-02, RSLT-04
- `.planning/phases/01-core-solver-engine/01-CONTEXT.md` — Phase 1 solver API contract (D-02: input format, D-03: output format, D-04: unwinnable result)
- `src/solver/solver.ts` — The `solve()` function that Phase 2 wraps in a Worker
- `src/solver/types.ts` — Core types: Hand, Move, SolverResult, TreeNode, SolverOptions

### Tech Stack
- `.planning/PROJECT.md` — Tech stack: React + TypeScript + Vite + TailwindCSS, card encoding 1-15
- `CLAUDE.md` — Recommended libraries: Comlink for Worker, zustand for state, clsx + tailwind-merge for styling

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/solver/solver.ts` — Top-level `solve()` function, direct integration point
- `src/solver/types.ts` — All shared types (Hand, Move, SolverResult, TreeNode, etc.)
- `src/solver/encoding.ts` — `createHand()` utility for converting card arrays to count-based representation
- `src/solver/move-gen.ts` — Move generation functions (may be useful for validation hints)

### Established Patterns
- Vitest for testing (84 + 33 + 37 tests from Phase 1)
- TypeScript strict mode
- Count-based hand encoding (15-element number arrays)
- Card values 1-15 where 1=A, 2-10=2-10, 11=J, 12=Q, 13=K, 14=小王, 15=大王

### Integration Points
- `solve(playerHand, opponentHand, options)` → `SolverResult` — the Worker wraps this call
- `SolverResult` has `winnable: boolean`, `bestMove: Move | null`, `tree: TreeNode | null`, `stats: { nodesExplored, timeMs, ttHits }`
- `createHand(cards: number[])` converts `[3, 3, 5, 7]` to count array for solver input

</code_context>

<specifics>
## Specific Ideas

- Visual poker cards with Chinese suit/volume terminology — make it feel like a real DDZ tool, not a generic solver
- "必胜" badge should be prominent and celebratory for winning positions
- Chinese-first UI: buttons like "求解", "清除", "取消" in Chinese

</specifics>

<deferred>
## Deferred Ideas

- Interactive decision tree visualization — Phase 3
- Step-by-step play simulation — Phase 3
- Tab-based view switching between tree and simulation — Phase 3
- Dark mode with system preference detection — v2
- Keyboard shortcuts — v2
- Shareable URLs — v2
- Preset classic puzzles — v2
- Mobile responsive layout — v2

</deferred>

---

*Phase: 02-interactive-app-worker*
*Context gathered: 2026-04-03*
