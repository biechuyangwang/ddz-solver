---
phase: 01-core-solver-engine
plan: 02
subsystem: solver
tags: [move-generation, combinations, game-tree, ddz]

# Dependency graph
requires:
  - phase: 01-core-solver-engine
    provides: "types.ts (HandType, Move, Hand, PASS_MOVE), constants.ts, encoding.ts (createHand), utils.ts (combinations)"
provides:
  - "generateLeadingMoves(hand): Move[] - all legal plays for leading mode"
  - "generateFollowingMoves(hand, lastMove): Move[] - beating plays + PASS for following mode"
  - "Complete move generation covering all 14 DDZ hand types in both modes"
affects: [search, solver, tree]

# Tech tracking
tech-stack:
  added: []
  patterns: ["SEQUENTIAL_INDICES array skipping index 1 (value 2) for sequential types", "combinations utility for airplane wing and four+two kicker generation"]

key-files:
  created:
    - src/solver/move-gen.ts
    - src/__tests__/solver/move-gen.test.ts
  modified: []

key-decisions:
  - "All sub-sequences of valid length are generated for straights/consecutive pairs/airplanes (not just maximal runs)"
  - "Following mode adds bomb/rocket overrides only for non-bomb, non-rocket last moves"

patterns-established:
  - "Sequential index array [0,2,3,...,12] used consistently across hand-types.ts and move-gen.ts to exclude value 2 from sequences"
  - "combinations() generator used for kicker selection in airplane wings and four+two types"
  - "PASS_MOVE always first in following mode results"

requirements-completed: [SOLV-02, SOLV-03, SOLV-06]

# Metrics
duration: 10min
completed: 2026-04-03
---

# Phase 1 Plan 2: Move Generation Summary

**Leading and following move generation for all 14 DDZ hand types with kicker combinations via combinations() utility**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-02T19:44:56Z
- **Completed:** 2026-04-02T19:55:16Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- generateLeadingMoves enumerates every legal play from a hand across all 14 hand types
- generateFollowingModes produces only valid beating plays plus PASS, with bomb/rocket overrides for non-bomb last moves
- Airplane wing kickers correctly exclude trio ranks from kicker pool using combinations() utility
- Four+two kickers correctly exclude the four-of-a-kind rank
- Sequential types (straight, consecutive pairs, airplanes) never include value 2 or jokers
- 33 test cases (17 leading + 16 following) covering all hand types

## Task Commits

Each task was committed atomically:

1. **Task 1: Move generation for leading mode** - `c8e5a18` (feat)
2. **Task 2: Move generation for following mode** - `3feaded` (feat)

## Files Created/Modified
- `src/solver/move-gen.ts` - generateLeadingMoves and generateFollowingMoves functions
- `src/__tests__/solver/move-gen.test.ts` - 33 test cases for both modes

## Decisions Made
- All valid sub-sequences are generated for straights/consecutive pairs/airplanes, not just maximal runs (e.g., 3-8 generates 3-7, 4-8, and 3-8 straights)
- Following mode adds bomb and rocket overrides only for non-bomb, non-rocket last moves; BOMB and ROCKET cases return early with only higher bombs and rocket respectively

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Test expectation for [3,4,5,6,7,8] straight count corrected**
- **Found during:** Task 1 (leading mode test verification)
- **Issue:** Plan specified 2 straights for 6 consecutive values, but correct behavior generates 3 (3-7, 4-8, 3-8)
- **Fix:** Updated test to expect 3 straights (2 of length 5, 1 of length 6)
- **Files modified:** src/__tests__/solver/move-gen.test.ts
- **Committed in:** c8e5a18

**2. [Rule 1 - Bug] Test hand for PAIR following needed paired 9s**
- **Found during:** Task 2 (following mode test verification)
- **Issue:** Test hand [3,3,7,7,9] had only one 9, not a pair, so it could not generate PAIR(9)
- **Fix:** Changed hand to [3,3,7,7,9,9]
- **Files modified:** src/__tests__/solver/move-gen.test.ts
- **Committed in:** 3feaded

**3. [Rule 3 - Blocking] TypeScript strict enum comparison warning**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** TypeScript TS2367 "unintentional comparison" for `lastMove.type !== HandType.BOMB && lastMove.type !== HandType.ROCKET` after exhaustive switch
- **Fix:** Replaced with explicit array-based check using `nonBombRocketTypes.includes(lastMove.type)`
- **Files modified:** src/solver/move-gen.ts
- **Committed in:** 3feaded

---

**Total deviations:** 3 auto-fixed (2 bug, 1 blocking)
**Impact on plan:** Minor test corrections and TypeScript compatibility fix. No scope creep.

## Issues Encountered
None beyond the test expectation corrections documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Move generation complete, ready for negamax search (Plan 03) which consumes generateLeadingMoves/generateFollowingMoves
- combinations() utility proven effective for complex kicker generation
- All 117 tests pass (encoding + hand-types + move-gen)

## Self-Check: PASSED

- FOUND: src/solver/move-gen.ts
- FOUND: src/__tests__/solver/move-gen.test.ts
- FOUND: .planning/phases/01-core-solver-engine/01-02-SUMMARY.md
- FOUND: commit c8e5a18
- FOUND: commit 3feaded

---
*Phase: 01-core-solver-engine*
*Completed: 2026-04-03*
