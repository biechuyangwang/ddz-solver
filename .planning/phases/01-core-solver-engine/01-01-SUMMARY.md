---
phase: 01-core-solver-engine
plan: 01
subsystem: solver-core
tags: [scaffold, types, encoding, hand-types, tdd]
dependency_graph:
  requires: []
  provides: [HandType enum, Hand type, Move interface, TreeNode interface, SolverResult, encoding utilities, combinations utility, classifyMove, canBeat]
  affects: [01-02-PLAN, 01-03-PLAN]
tech_stack:
  added: [typescript@5.8, vitest@3.2]
  patterns: [count-based-hand-encoding, enum-discriminated-types, generator-function-combinations]
key_files:
  created:
    - src/solver/types.ts
    - src/solver/constants.ts
    - src/solver/encoding.ts
    - src/solver/utils.ts
    - src/solver/hand-types.ts
    - src/__tests__/solver/encoding.test.ts
    - src/__tests__/solver/hand-types.test.ts
    - package.json
    - tsconfig.json
    - vitest.config.ts
  modified: []
decisions:
  - Count-based hand encoding (array of 15 counters) chosen over bitmask for clarity and simplicity
  - sequentialIndices helper array skips index 1 (value 2) for sequential type detection
  - classifyMove uses greedy detection order (rocket > bomb > complex > simple) to avoid ambiguity
  - FOUR_TWO_SINGLES accepts a pair as two individual kickers (standard DDZ rule)
metrics:
  duration: 13m
  completed: 2026-04-03
  tests: 84
  files_created: 10
---

# Phase 01 Plan 01: Core Types, Encoding, and Hand Type Classification Summary

Count-based hand encoding (15-element counter array), all 14 DDZ hand type classifications with value-2 exclusion from sequential types, combinations utility, and comprehensive test suite (84 tests).

## What Was Done

### Task 1: Project scaffold, types, encoding, and combinations utility

- Created TypeScript project with Vitest (ES2022, strict mode, ESNext modules)
- Defined core types: `HandType` enum (15 values), `Hand` type alias, `Move` interface, `PASS_MOVE` constant, `SolverOptions`, `SearchStats`, `SolverResult`, `TreeNode` interfaces
- Implemented encoding utilities: `createHand`, `handIsEmpty`, `handSize`, `applyMove`, `cloneHand`
- Implemented `combinations<T>` generator function (port of Python itertools.combinations)
- Defined constants: `MIN_STRAIGHT_LENGTH=5`, `MIN_CONSECUTIVE_PAIRS_LENGTH=3`, `MIN_AIRPLANE_LENGTH=2`, `MAX_SEQUENTIAL_VALUE=13`, `CARD_COUNT=15`, `DEFAULT_TIME_BUDGET=10000`
- 26 tests for encoding and combinations

### Task 2: Hand type detection and classification for all 14 DDZ hand types

- Implemented `classifyMove(cards: number[]): Move | null` detecting all 14 hand types
- Implemented `canBeat(lastMove: Move, currentMove: Move): boolean` with DDZ hierarchy
- Value 2 (index 1) correctly excluded from all sequential types via `sequentialIndices` helper
- Rocket distinct from bomb (both jokers vs four-of-a-kind)
- Detection order prevents ambiguity: rocket > bomb > four+two > airplane variants > consecutive pairs > straight > triple+pair > triple+single > triple > pair > single
- 58 tests covering all hand types, edge cases, and beat hierarchy

## Key Decisions

1. **Count-based encoding over bitmask**: Array of 15 counters is clearer and sufficient for two-player endgame (max ~10 cards per hand). Performance difference vs bitmask is negligible at this scale.
2. **sequentialIndices array**: `[0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]` explicitly skips index 1 (value 2) for all sequential type detection. This avoids the "gap in sequence" problem without special-case branching.
3. **Greedy detection order in classifyMove**: Rocket and bomb checked first, then complex types (four+two, airplane variants), then simple types. This prevents a bomb (4 of a kind) from being misclassified as a triple.
4. **FOUR_TWO_SINGLES accepts pair as two kickers**: Standard DDZ rule -- the two "singles" in four+two-singles can be a pair of the same rank.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test expectation for FOUR_TWO_PAIRS edge case**
- **Found during:** Task 2 GREEN phase
- **Issue:** Test expected `classifyMove([8,8,8,8,3,3])` to return null, but it correctly classifies as FOUR_TWO_SINGLES (4 eights + 2 kicker singles)
- **Fix:** Updated test to expect FOUR_TWO_SINGLES classification instead of null, since 6 cards with 4+pair is valid four+two-singles
- **Files modified:** `src/__tests__/solver/hand-types.test.ts`
- **Commit:** 4f5e144

## Test Results

```
Test Files  2 passed (2)
Tests       84 passed (84)
- encoding.test.ts: 26 tests
- hand-types.test.ts: 58 tests
TypeScript: compiles with no errors
```

## Files Created/Modified

| File | Purpose | Exports |
|------|---------|---------|
| `src/solver/types.ts` | Core type definitions | HandType, Hand, Move, PASS_MOVE, SolverOptions, SearchStats, SolverResult, TreeNode |
| `src/solver/constants.ts` | Game constants | MIN_STRAIGHT_LENGTH, MIN_CONSECUTIVE_PAIRS_LENGTH, MIN_AIRPLANE_LENGTH, MAX_SEQUENTIAL_VALUE, CARD_COUNT, DEFAULT_TIME_BUDGET |
| `src/solver/encoding.ts` | Hand encoding utilities | createHand, handIsEmpty, handSize, applyMove, cloneHand |
| `src/solver/utils.ts` | Combinatorial utility | combinations |
| `src/solver/hand-types.ts` | Hand type classification | classifyMove, canBeat |
| `src/__tests__/solver/encoding.test.ts` | Encoding tests (26) | - |
| `src/__tests__/solver/hand-types.test.ts` | Hand type tests (58) | - |

## Self-Check: PASSED

All 11 files verified present. Both commits (b2ea130, 4f5e144) verified in git history.
