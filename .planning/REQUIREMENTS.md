# Requirements: DDZ Solver (斗地主残局求解器)

**Defined:** 2026-04-03
**Core Value:** 给定任意两人残局局面，快速算出先手方必胜的完整决策路径——无论对手怎么出牌，都能赢。

## v1 Requirements

### Card Input

- [ ] **CARD-01**: User can input both players' hands using visual card picker (click-to-select from full deck)
- [ ] **CARD-02**: Cards displayed with suit symbols and face values (visual poker cards, not text codes)
- [ ] **CARD-03**: User can select first/second player (default: user goes first)
- [ ] **CARD-04**: User can clear/reset input with undo support
- [ ] **CARD-05**: Input validation prevents illegal states (max 4 of each value, total cards match)

### Solver Engine

- [x] **SOLV-01**: Bitmask game state representation (17-bit counters per hand for values 1-15)
- [x] **SOLV-02**: Recognize all 14 standard DDZ hand types: single, pair, triple, triple+1, triple+2, straight (5+), consecutive pairs (3+), airplane, airplane+singles, airplane+pairs, four+2singles, four+2pairs, bomb, rocket
- [ ] **SOLV-03**: Move generator enumerates all legal plays for leading and following modes
- [ ] **SOLV-04**: Minimax search with alpha-beta pruning computes optimal play
- [ ] **SOLV-05**: Transposition table with Zobrist hashing for state deduplication
- [ ] **SOLV-06**: Pass (过) handled as valid move in game tree
- [ ] **SOLV-07**: Time budget enforcement (default 10s, returns best partial result)
- [ ] **SOLV-08**: Decision tree built during search captures all winning paths

### Worker Integration

- [ ] **WORK-01**: Solver runs in Web Worker via Comlink (non-blocking UI)
- [ ] **WORK-02**: Progress indicator shows solver status during computation
- [ ] **WORK-03**: User can cancel in-progress solve

### Decision Tree Visualization

- [ ] **TREE-01**: Interactive tree diagram shows complete winning decision tree
- [ ] **TREE-02**: Nodes expandable/collapsible, color-coded (win/lose branches)
- [ ] **TREE-03**: Clicking a tree node shows card details for that state
- [ ] **TREE-04**: Virtualized rendering handles large trees (>500 nodes)

### Step-by-Step Simulation

- [ ] **SIM-01**: Step-by-step mode walks through optimal play sequence move by move
- [ ] **SIM-02**: Each step shows: current player, cards played, remaining hands
- [ ] **SIM-03**: Opponent's possible responses displayed with winning counter-moves highlighted
- [ ] **SIM-04**: Navigation controls: next/prev step, auto-play, jump to specific step

### Result Display

- [ ] **RSLT-01**: Clear win/lose result with "必胜" (guaranteed win) badge
- [ ] **RSLT-02**: Search statistics displayed (nodes explored, time, transposition hits)
- [ ] **RSLT-03**: Tab-based view switching between tree and simulation modes
- [ ] **RSLT-04**: Chinese language UI (primary), English acceptable for technical terms

## v2 Requirements

### Enhanced UX

- **UX-01**: Dark mode with system preference detection
- **UX-02**: Keyboard shortcuts for tree navigation and simulation control
- **UX-03**: Shareable URLs encoding hand positions
- **UX-04**: Preset classic DDZ endgame puzzles (10-20 curated positions)

### Mobile

- **MOB-01**: Responsive mobile layout for phone usage
- **MOB-02**: Touch-friendly card input for mobile

## Out of Scope

| Feature | Reason |
|---------|--------|
| Three-player DDZ | Search space exponentially larger, requires backend |
| AI opponent / real-time play | This is a solver, not a game engine |
| User accounts / login | Adds unnecessary backend complexity |
| Puzzle community / social features | Social product scope, not solver scope |
| Backend server | Pure frontend computation sufficient for two-player |
| Screen OCR from DDZ apps | Platform-specific, ethical/legal concerns |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CARD-01 | Phase 2 | Pending |
| CARD-02 | Phase 2 | Pending |
| CARD-03 | Phase 2 | Pending |
| CARD-04 | Phase 2 | Pending |
| CARD-05 | Phase 2 | Pending |
| SOLV-01 | Phase 1 | Complete |
| SOLV-02 | Phase 1 | Complete |
| SOLV-03 | Phase 1 | Pending |
| SOLV-04 | Phase 1 | Pending |
| SOLV-05 | Phase 1 | Pending |
| SOLV-06 | Phase 1 | Pending |
| SOLV-07 | Phase 1 | Pending |
| SOLV-08 | Phase 1 | Pending |
| WORK-01 | Phase 2 | Pending |
| WORK-02 | Phase 2 | Pending |
| WORK-03 | Phase 2 | Pending |
| TREE-01 | Phase 3 | Pending |
| TREE-02 | Phase 3 | Pending |
| TREE-03 | Phase 3 | Pending |
| TREE-04 | Phase 3 | Pending |
| SIM-01 | Phase 3 | Pending |
| SIM-02 | Phase 3 | Pending |
| SIM-03 | Phase 3 | Pending |
| SIM-04 | Phase 3 | Pending |
| RSLT-01 | Phase 2 | Pending |
| RSLT-02 | Phase 2 | Pending |
| RSLT-03 | Phase 3 | Pending |
| RSLT-04 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after initial definition*
