# Phase 1: Core Solver Engine - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

A correct, performant solver engine that given any two-player DDZ endgame position, computes the provably optimal strategy and builds a complete decision tree. Pure computation logic — no UI, no Worker integration. Verified entirely by automated tests.

</domain>

<decisions>
## Implementation Decisions

### Solver API
- **D-01:** Claude decides the top-level API shape (function-based vs class-based) based on implementation needs — user deferred this choice
- **D-02:** Input format: two number arrays representing each player's hand, plus options (timeBudget, firstPlayerIsUser)
- **D-03:** Output includes: win/loss result, decision tree, and search statistics (nodes explored, time, transposition hits)

### Unwinnable Position Handling
- **D-04:** Solver returns a flat "not winnable" result when no guaranteed winning strategy exists — `{ winnable: false, bestMove: null }`
- **D-05:** No best-effort strategy computation for losing positions — keep it simple and honest

### Decision Tree Granularity
- **D-06:** Full tree — include every possible opponent response for each winning move
- **D-07:** Matches SOLV-08 requirement: "captures all winning paths"

### Tree Node Format
- **D-08:** Claude decides node data structure (compact vs full state) based on memory/performance tradeoff

### Claude's Discretion
- Top-level solver API shape (function vs class)
- Decision tree node data structure
- Bitmask encoding details
- Move generation algorithm specifics
- Alpha-beta pruning move ordering heuristic
- Transposition table implementation details
- Internal test case selection

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Solver Engine Requirements
- `.planning/REQUIREMENTS.md` — SOLV-01 through SOLV-08: bitmask encoding, 14 hand types, move generation, minimax+alpha-beta, transposition table, pass handling, time budget, decision tree
- `.planning/PROJECT.md` — Card encoding convention (1-13 = A-K, 14 = 小王, 15 = 大王), tech stack constraints, performance target (< 10s)

### State Blockers
- `.planning/STATE.md` — Blocker note: airplane+wings kicker combination generation not well-documented in English; recommend studying doudizhu_solver C++ implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing source code

### Established Patterns
- None — first phase establishes all patterns

### Integration Points
- Solver output contract is the integration point for Phase 2 (Worker) and Phase 3 (visualization)
- Tree node structure directly affects Phase 3 tree visualization complexity

</code_context>

<specifics>
## Specific Ideas

- No specific requirements — standard minimax solver approach is appropriate
- User deferred most implementation choices to Claude's discretion
- Focus on correctness first, performance via alpha-beta + transposition table

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-solver-engine*
*Context gathered: 2026-04-03*
