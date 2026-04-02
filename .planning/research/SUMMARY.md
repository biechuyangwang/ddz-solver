# Project Research Summary

**Project:** DDZ Solver (斗地主残局求解器)
**Domain:** Two-player perfect-information card game solver (browser-based)
**Researched:** 2026-04-03
**Confidence:** MEDIUM

## Executive Summary

This is a two-player Dou Di Zhu (斗地主) endgame solver -- a pure-client web application where users input both players' hands and the system computes the provably optimal strategy using minimax search with alpha-beta pruning. The product sits at the intersection of game theory tooling and educational software: no existing web-based DDZ endgame solver offers interactive decision tree visualization, making this a genuine niche. The closest competitors are C++ CLI tools with zero UI.

The recommended approach is a three-layer architecture: (1) a solver engine running in a Web Worker using bitmask game state representation, Zobrist hashing, and transposition tables; (2) a Comlink-based RPC bridge for type-safe worker communication; and (3) a React + Zustand UI with React Flow for interactive tree visualization and a step-by-step simulation mode. The solver must handle DDZ's ~15 distinct hand types, which is both the hardest table stake to implement correctly and the most common source of bugs in competing implementations.

The primary risks are combinatorial explosion from naive move generation (branching factor can exceed 200 for a 10-card hand), card type recognition edge cases (DDZ has subtle rules about which cards can form sequences, and getting these wrong produces silently incorrect solver output), and decision tree rendering performance for large trees. All three are mitigated by making correct architectural decisions early: bitmask state from day one, exhaustive card type tests before solver logic, and virtualized tree rendering designed in from the start rather than retrofitted.

## Key Findings

### Recommended Stack

The stack is user-specified and well-supported: React 19, TypeScript 6, Vite 8, TailwindCSS v4. Supporting libraries are Comlink (Web Worker RPC), Zustand (state management), @xyflow/react (interactive tree visualization), framer-motion (card animations), lucide-react (icons), clsx + tailwind-merge (conditional styling), and Vitest (testing). TailwindCSS v4 uses a fundamentally different configuration model than v3 -- CSS-first via `@theme`, no `tailwind.config.js` -- which is a common trip point. The only version compatibility risk is `vite-plugin-comlink` with Vite 8 (plugin lists Vite 5+ as peer dependency); manual Worker + Comlink setup is the fallback.

**Core technologies:**
- React 19 + TypeScript 6: UI framework with strict typing essential for game state correctness
- Vite 8: Build tool with native Web Worker support, critical for solver offloading
- TailwindCSS v4: CSS-first config via `@theme` (not the v3 `tailwind.config.js` approach)
- Comlink: Eliminates postMessage boilerplate for Worker communication
- Zustand: Lightweight state management with selector-based re-render control
- @xyflow/react (React Flow): Custom node rendering needed for card visuals inside tree nodes
- Vitest: Native Vite integration for testing card type rules and solver correctness

### Expected Features

**Must have (table stakes):**
- All 15 standard DDZ hand types recognized correctly (single, pair, triple, triple+1, triple+2, straight, consecutive pairs, airplane+wings variants, four+2 variants, bomb, rocket)
- Minimax solver with alpha-beta pruning producing provably correct win/lose result
- Visual card display (suit symbols, card faces -- not raw numbers)
- Web Worker non-blocking computation with progress indication
- Chinese language UI (primary audience is Chinese DDZ players)
- Card input for both hands with validation

**Should have (competitive):**
- Interactive decision tree visualization (the killer differentiator -- no existing DDZ tool has this)
- Step-by-step play simulation (how users actually consume the solution)
- Dual view with tree-to-simulation linking (click tree node, jump to that step)
- Click-select visual deck input (faster, fewer errors than text entry)
- Opponent response highlighting in tree view
- Preset classic endgame puzzles for demo purposes

**Defer (v2+):**
- Shareable URLs / export
- Dark mode
- Keyboard shortcuts
- Mobile-responsive layout refinement

### Architecture Approach

The system has three layers: (1) Solver Engine in a Web Worker using bitmask game state, card type recognizer, move generator (with priority ordering for alpha-beta efficiency), minimax search with transposition table and Zobrist hashing, and a decision tree builder that stores only winning paths. (2) A Comlink-based Worker bridge with a typed message protocol (SolveRequest, SolveResult, SolveResultWithTree). (3) A single-page React app with Zustand store split into three state slices (input, solver, UI), using React Flow for tree visualization and a flat-list virtualized approach for performance.

**Major components:**
1. Solver Engine (solver/) -- Pure computation: game state (bitmask), card type recognizer, move generator, minimax + alpha-beta + transposition table, decision tree builder
2. Worker Bridge (worker/) -- Comlink RPC wrapping the solver, typed request/response protocol, progress reporting
3. React UI (src/) -- Zustand store (3 slices), card input with visual picker, React Flow tree view, step-by-step simulator, status/progress display

### Critical Pitfalls

1. **Combinatorial explosion from naive move generation** -- DDZ branching factor exceeds 200 for a 10-card hand. Prevention: Zobrist hashing + transposition table from day one, alpha-beta with move ordering, iterative deepening, hard time budget.
2. **Card type recognition edge cases** -- "2" and jokers cannot appear in sequences; rocket is not a bomb; four-with-two is not a bomb; airplane wings must be all singles or all pairs. Prevention: Write 50+ test cases covering all types and edge cases before writing solver logic. Use an internal rank ordering (3=0, 4=1, ..., A=11, 2=12, SJ=13, BJ=14) for game logic, separate from input encoding.
3. **Game state immutability bugs producing silently wrong results** -- Shared mutable state, shallow copies, or Zobrist hash corruption cause the solver to explore nonexistent states. Prevention: Immutable game state with `readonly` TypeScript types; bitmask representation (cheap to copy); debug invariant checks for card count consistency.
4. **Decision tree visualization freezing on large trees** -- Naive recursive rendering of thousands of nodes freezes the browser. Prevention: Flatten tree into a virtualized list from the start; lazy expansion (start collapsed); memoize node components; use text labels in tree nodes, card graphics only in detail panel.
5. **React re-render storms from solver state** -- Storing solver result, tree expansion state, and input state in a single atom causes cascading re-renders. Prevention: Three separate Zustand slices (input, solver, UI); stable callbacks; tree data frozen once computed, expansion state stored separately as a Set of node IDs.

## Implications for Roadmap

### Phase 1: Core Solver Engine
**Rationale:** The solver is the foundation -- everything depends on it producing correct results. Card type recognition must be implemented and exhaustively tested before any search logic. Bitmask state representation and Zobrist hashing must be designed in from the start; retrofitting them is a near-complete rewrite.
**Delivers:** A correct, performant solver engine with comprehensive test coverage, runnable in Node.js (no UI yet).
**Addresses:** Table stakes -- all 15 hand types, minimax solver, correct win/lose results, pass handling, bomb escalation.
**Avoids:** Pitfalls 1 (combinatorial explosion), 2 (card type edge cases), 5 (immutability bugs).
**Key modules:** game-state.ts, card-types.ts, move-gen.ts, search.ts, tree-builder.ts, plus 50+ unit tests for card types and 10+ integration tests with known endgame positions.
**Scope:** ~9-10 days estimated effort.

### Phase 2: UI Foundation + Worker Integration
**Rationale:** With a working solver, the next value delivery is the basic user flow: input cards, solve, see result. This requires scaffolding the React app, wrapping the solver in a Web Worker, and building the card input and result display. The Worker message protocol and lifecycle must be designed carefully to avoid data transfer bottlenecks.
**Delivers:** A working web app where users input two hands, click solve, and see win/lose result with visual card display.
**Uses:** React 19, TypeScript, Vite, TailwindCSS v4, Comlink, Zustand, Vitest + Testing Library.
**Implements:** Worker bridge (Comlink), Zustand store (3 slices), card input form, visual card components, result display, progress indicator, Chinese language UI, input validation.
**Avoids:** Pitfall 3 (Worker data transfer), Pitfall 6 (re-render storms), Worker cleanup and error handling gotchas.
**Scope:** ~5-6 days estimated effort.

### Phase 3: Visualization + Simulation
**Rationale:** The tree visualization and step-by-step simulation are the killer differentiators that justify this project's existence over CLI tools. They depend on a correct solver producing a complete decision tree, so they come last. The tree component must use virtualization from the start -- this is non-negotiable given that real endgame trees can exceed 5000 nodes.
**Delivers:** Interactive decision tree (React Flow), step-by-step play simulation, dual view with tree-to-simulation linking, opponent response highlighting.
**Uses:** @xyflow/react, @tanstack/react-virtual (or flat-list virtualization), framer-motion (transitions).
**Implements:** Tree visualization page, simulation page, tab/panel switching, node expand/collapse, path highlighting.
**Avoids:** Pitfall 4 (tree rendering freeze).
**Scope:** ~8-10 days estimated effort.

### Phase Ordering Rationale

- Phase 1 (solver) comes first because it is the hard technical dependency. If the solver is wrong, the entire product is wrong. It also has the highest risk -- card type edge cases and search performance are solvable in isolation without UI concerns.
- Phase 2 (UI + Worker) comes second because it delivers the minimum viable user experience. The Worker integration is architecturally significant and needs to be right (persistent worker, typed protocol, progress throttling).
- Phase 3 (visualization) comes last because it is pure presentation layer. It depends on the solver producing correct, complete decision trees. It is also the largest UI effort and benefits from having a stable foundation.
- This order means each phase can be validated independently: Phase 1 by running test suites, Phase 2 by manually testing the solve flow, Phase 3 by testing tree interaction performance.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Solver):** Move generation for DDZ is not well-documented in English. The card type rules are well-known but the algorithm for efficiently enumerating all legal plays from a bitmask hand representation needs careful design. Recommend researching existing DDZ solver implementations (WZ403809264/doudizhu_solver on GitHub) for algorithmic patterns.
- **Phase 3 (Tree Visualization):** React Flow + virtualization for large trees is a specific integration pattern that needs research. The interaction between React Flow's node rendering model and virtualization (flat-list vs. viewport-based) is not a standard pattern. Also, the layout algorithm (dagre vs. elkjs) choice should be validated against expected tree sizes.

Phases with standard patterns (skip additional research):
- **Phase 2 (UI + Worker):** Vite + React + TailwindCSS v4 + Comlink + Zustand are all well-documented. The integration pattern is standard.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions verified via npm registry; user-specified core stack; well-established ecosystem. Only risk is vite-plugin-comlink with Vite 8 (has fallback). |
| Features | MEDIUM | Competitive analysis via GitHub is comprehensive. Gap: could not verify Chinese consumer app ecosystem (app stores, WeChat mini-programs) for competing tools due to search rate limits. The feature prioritization is well-grounded in poker solver UX patterns (PioSolver, GTO+). |
| Architecture | MEDIUM | Architecture is based on domain knowledge and established patterns for game tree search + browser apps. The bitmask state representation and three-layer separation are sound. The React Flow + virtualization integration for tree rendering needs validation during implementation. |
| Pitfalls | HIGH | Pitfalls are based on well-established knowledge in combinatorial game theory, DDZ community resources, Web Worker specs, and React performance patterns. Card type edge cases and combinatorial explosion are documented risks in the DDZ solver ecosystem. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **DDZ move generation algorithm:** The rules for each hand type are clear, but the algorithm for efficiently enumerating all legal plays from a bitmask hand (especially for complex types like airplane+wings with kicker combinations) is not well-documented. Recommend studying the doudizhu_solver C++ implementation during Phase 1 planning.
- **React Flow + virtualization integration:** React Flow is a node-graph library, not a virtualized list. Using it for large trees (1000+ nodes) with virtualization requires either (a) flattening the tree and using a custom virtualized list renderer, or (b) using React Flow's built-in viewport optimization and limiting rendered nodes. This decision should be validated with a prototype during Phase 3 planning.
- **Chinese consumer app competition:** GitHub analysis shows no competing web-based DDZ endgame solver with tree visualization, but the Chinese app ecosystem (WeChat mini-programs, app stores) was not fully searchable. If this product targets Chinese users specifically, additional market research may be warranted before investing in localization depth.

## Sources

### Primary (HIGH confidence)
- npm registry -- All package versions verified directly (2026-04-03)
- MDN Web Worker documentation -- Structured clone, Transferable objects, Worker lifecycle
- Russell & Norvig, *AI: A Modern Approach* -- Game tree search, alpha-beta pruning, transposition tables
- DouZero (ICML 2021) and related papers -- DDZ game tree complexity and branching factor analysis
- Established DDZ card type rules -- Cross-referenced across multiple Chinese-language game references

### Secondary (MEDIUM confidence)
- GitHub: WZ403809264/doudizhu_solver -- C++ CLI DDZ endgame solver, reference for algorithmic approach and performance baselines
- GitHub: kwai/DouZero -- Reinforcement learning DDZ AI (2061+ stars), ecosystem reference
- Poker solver UX patterns (PioSolver, GTO+) -- Industry standard for game tree visualization
- TailwindCSS v4 documentation -- CSS-first config approach (could not fully verify due to rate limits)
- React Flow (@xyflow/react) documentation -- Custom nodes, layout integration patterns

### Tertiary (LOW confidence)
- GitHub ecosystem search (30+ repos surveyed) -- No competing web-based DDZ endgame solver with tree visualization found, but search may not cover Chinese platforms
- Bitmask card representation for DDZ -- Adapted from poker evaluator techniques (Cactus Kev); DDZ-specific adaptation needs validation since suits do not matter in most DDZ plays
- TailwindCSS v4 migration patterns -- Based on release knowledge rather than hands-on verification with v4.2

---
*Research completed: 2026-04-03*
*Ready for roadmap: yes*
