# Phase 1: Core Solver Engine - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 1-core-solver-engine
**Areas discussed:** Solver API, Unwinnable Position Handling, Decision Tree Granularity

---

## Solver Input/Output API

| Option | Description | Selected |
|--------|-------------|----------|
| Simple function call | Function takes two number arrays + options, returns result object. Clean, testable, Worker-friendly. | |
| Class-based API | Stateful solver with .setPosition(), .solve(), .cancel(). Supports progressive solving. | |
| You decide | Claude decides based on implementation needs | ✓ |

**User's choice:** You decide
**Notes:** User deferred this to Claude's discretion — simple function approach is recommended unless cancellation needs demand class-based design

---

## Decision Tree Node Format

| Option | Description | Selected |
|--------|-------------|----------|
| Compact node format | Each node: playedCards, currentPlayer, isWinningNode, children. Simple, UI-friendly. | |
| Full state per node | Each node also stores both players' full hands. More redundant but simpler for consumers. | |
| You decide | Claude decides based on memory/performance tradeoff | ✓ |

**User's choice:** You decide
**Notes:** User deferred to Claude — compact format recommended for memory efficiency with Phase 3 reconstruction

---

## Unwinnable Position Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Flat 'not winnable' result | Returns { winnable: false, bestMove: null }. Simple, honest. | ✓ |
| Best-effort strategy | Finds strategy that delays loss longest. More useful but much more complex. | |
| Show opponent's win path | Returns not-winnable + opponent's winning path for study. | |

**User's choice:** Flat 'not winnable' result
**Notes:** User wants simplicity — solver's job is to find guaranteed wins, not approximate strategies

---

## Decision Tree Granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Full tree — all responses | Every possible opponent response included. Complete analysis, larger tree. | ✓ |
| Pruned — skip trivial branches | Skip branches where only one legal play exists. Smaller tree. | |
| You decide | Claude decides based on performance constraints | |

**User's choice:** Full tree — all responses
**Notes:** Matches SOLV-08 requirement "captures all winning paths". Complete analysis preferred over optimization.

---

## Claude's Discretion

- Top-level solver API shape (function vs class)
- Decision tree node data structure
- Bitmask encoding, move generation, pruning heuristics
- Internal implementation details

## Deferred Ideas

None — discussion stayed within phase scope
