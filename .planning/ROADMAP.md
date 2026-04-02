# Roadmap: DDZ Solver (斗地主残局求解器)

## Overview

Build a two-player Dou Di Zhu endgame solver as a pure-client web app. Phase 1 produces the solver engine -- bitmask game state, all 14 hand types, minimax search with alpha-beta pruning, transposition tables, and decision tree construction -- verified entirely by automated tests. Phase 2 wraps that engine in a Web Worker and builds the basic interactive app: visual card input, solve trigger, and win/lose result display. Phase 3 delivers the differentiating features -- interactive decision tree visualization and step-by-step play simulation -- that justify this project over existing CLI tools.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Core Solver Engine** - Bitmask game state, all 14 hand types, minimax with alpha-beta pruning, transposition table, decision tree builder
- [ ] **Phase 2: Interactive App + Worker** - Visual card input, Web Worker integration, solve trigger, result display with Chinese UI
- [ ] **Phase 3: Visualization + Simulation** - Interactive decision tree, step-by-step play simulation, tab-based dual view

## Phase Details

### Phase 1: Core Solver Engine
**Goal**: A correct, performant solver engine that given any two-player DDZ endgame position, computes the provably optimal strategy and builds a complete decision tree
**Depends on**: Nothing (first phase)
**Requirements**: SOLV-01, SOLV-02, SOLV-03, SOLV-04, SOLV-05, SOLV-06, SOLV-07, SOLV-08
**Success Criteria** (what must be TRUE):
  1. Given a known-winnable endgame position, the solver correctly identifies it as a guaranteed win with the optimal first move
  2. All 14 standard DDZ hand types are recognized correctly, including edge cases (no 2/jokers in sequences, rocket distinct from bomb, airplane wings uniform)
  3. Solver completes two-player endgame search within 10 seconds for positions up to 10 cards per hand
  4. Decision tree captures all winning paths, and every path through the tree leads to a terminal winning state when followed
  5. Pass (过) is correctly handled as a valid move, and the solver correctly alternates play control after consecutive passes
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffold, types, encoding, combinations utility, hand type detection/classification (SOLV-01, SOLV-02)
- [x] 01-02-PLAN.md -- Move generation for leading and following modes, all 14 hand types (SOLV-02, SOLV-03, SOLV-06)
- [x] 01-03-PLAN.md -- Transposition table, negamax search, decision tree, solver API, integration tests (SOLV-04, SOLV-05, SOLV-06, SOLV-07, SOLV-08)

### Phase 2: Interactive App + Worker
**Goal**: Users can input both players' hands through a visual card picker, trigger the solver, and see the win/lose result with search statistics -- all in a Chinese-language web interface
**Depends on**: Phase 1
**Requirements**: CARD-01, CARD-02, CARD-03, CARD-04, CARD-05, WORK-01, WORK-02, WORK-03, RSLT-01, RSLT-02, RSLT-04
**Success Criteria** (what must be TRUE):
  1. User can click to select cards from a full 54-card deck to build both players' hands, with cards displayed as visual poker cards (suit symbols + face values)
  2. User can choose to go first or second (defaulting to first), clear/reset input, and input validation prevents illegal states (max 4 per value, no card duplication between hands)
  3. Clicking "solve" runs the solver in a Web Worker without freezing the UI, shows a progress indicator during computation, and allows cancellation
  4. After solving, the user sees a clear win/lose result with a "必胜" badge for guaranteed wins, plus search statistics (nodes explored, time, transposition hits)
  5. The entire UI is in Chinese language, with English acceptable only for technical terms in statistics
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Visualization + Simulation
**Goal**: Users can explore the complete winning decision tree interactively and walk through the optimal play sequence step by step, switching between both views
**Depends on**: Phase 2
**Requirements**: TREE-01, TREE-02, TREE-03, TREE-04, SIM-01, SIM-02, SIM-03, SIM-04, RSLT-03
**Success Criteria** (what must be TRUE):
  1. An interactive tree diagram renders the complete winning decision tree, with nodes expandable/collapsible and color-coded to distinguish win branches from lose branches
  2. Clicking any tree node shows the card details for that game state (both players' remaining hands and the cards played to reach that node)
  3. Step-by-step mode walks through the optimal play sequence one move at a time, showing current player, cards played, and remaining hands at each step
  4. Opponent's possible responses are displayed at each simulation step, with the winning counter-moves highlighted
  5. Navigation controls allow next/prev step, auto-play, and jumping to a specific step; tab-based view switching between tree and simulation modes
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Solver Engine | 1/3 | In Progress|  |
| 2. Interactive App + Worker | 0/? | Not started | - |
| 3. Visualization + Simulation | 0/? | Not started | - |
