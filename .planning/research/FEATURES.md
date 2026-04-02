# Feature Landscape

**Domain:** Two-player Dou Di Zhu (斗地主) endgame solver web application
**Researched:** 2026-04-03
**Overall confidence:** MEDIUM (web search rate-limited; findings based on GitHub ecosystem analysis, existing competitor analysis, training data on card game solver UX patterns, and poker solver best practices)

## Competitive Landscape

Existing tools in this space fall into distinct categories:

1. **Full-game AI engines** (DouZero, DouZero_For_HappyDouDiZhu) -- Reinforcement learning bots that play complete 3-player games. Not endgame solvers. Overkill for the puzzle use case.
2. **CLI endgame solvers** (WZ403809264/doudizhu_solver) -- C++ command-line tools. Fast but zero UI. Users must type card codes. The most direct competitor conceptually.
3. **Full game implementations** (tian11111/doudizhu-web, zhangzan/doudizhu) -- Complete 3-player game UIs with basic AI. No solver mode, no tree visualization.
4. **Poker solver UIs** (PioSolver, GTO+) -- The gold standard for game-tree visualization in card games. Desktop apps, expensive, extremely feature-rich. These define what "professional solver UX" looks like.

**Gap in the market:** There is no prominent web-based, two-player DDZ endgame solver with interactive tree visualization. The closest thing is a C++ CLI tool. This is a genuine niche.

---

## Table Stakes

Features users expect. Missing these means the product feels broken or incomplete. Users of 斗地主残局 tools arrive with expectations shaped by game apps (欢乐斗地主, JJ斗地主) and solver tools.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Card input for both hands | The core interaction -- without it, nothing works | Low | Must support all standard DDZ cards (3-2, jokers). Users expect visual card input, not text codes. |
| All standard card patterns (牌型) | DDZ has ~15 distinct hand types. Missing any makes the solver wrong | Med | Single, pair, triple, triple+1, triple+2, straight (5+), consecutive pairs (3+), airplane+wings, four+2, bomb, rocket. This is the hardest "table stake" to implement correctly. |
| Solver computes winning strategy | The entire reason the app exists | High | Minimax + alpha-beta pruning. Must handle "first player wins" / "second player wins" / draw (should not happen in DDZ). |
| Visual card display (not text) | Users come from 欢乐斗地主 etc. and expect poker card visuals | Med | Cards with suit symbols, face card imagery or at minimum clean styled card faces. Pure numbers would feel like a developer tool. |
| Result display (win/lose) | Immediate feedback after solving | Low | Clear indication of which side wins. |
| Web-based, no install | Modern users expect browser-based tools | Low | Vite + React handles this natively. |
| Responsive layout | Users may access on phone during/after playing DDZ | Med | Mobile-first for Chinese market especially. Desktop layout for detailed tree view. |
| Chinese language UI | Target audience is Chinese DDZ players | Low | All labels, instructions, and outputs in Chinese. English as secondary is fine but Chinese is primary. |

## Important Features

Not strictly table stakes, but their absence would make the tool feel primitive compared to what users expect from modern web apps.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Step-by-step play simulation | Users want to walk through the optimal play sequence move by move | Med | Critical for learning. Show cards played each turn, who plays, pass/beat indicators. This is how 残局 apps on mobile work. |
| First/second player toggle | Sometimes you want to analyze from the other perspective | Low | Simple toggle. Default to "user goes first". |
| Non-blocking computation | Solver may take seconds for complex positions | Med | Web Worker is required. Progress indicator during computation. No frozen UI. |
| Pass (过) handling | In DDZ you can pass your turn. The solver must account for this | Med | Pass is a valid "play" in the game tree. Not optional -- it is part of the rules. |
| Undo / reset input | Users will make typos when entering cards | Low | Clear/reset buttons for card input. Ideally undo last card selection. |
| Computation timeout handling | Some positions may be computationally infeasible | Low | Set a timeout (e.g., 30s). Show clear message if unsolved. Do not hang forever. |

## Differentiators

Features that set this product apart from the CLI tools and game implementations that currently exist. These create the "wow factor."

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Interactive decision tree visualization** | No existing DDZ endgame tool has this. Users can explore the full game tree, see branching outcomes, understand WHY a path wins. | High | This is the killer feature. Expandable/collapsible nodes, color-coded win/lose branches, click to explore sub-trees. Poker solvers (PioSolver) charge $249+ for this kind of visualization. In DDZ space, nobody has it. |
| **Dual view: tree + step-by-step** | Users can switch between analytical (tree) and practical (step-by-step) views | Med | Tree view for deep analysis. Step-by-step for practical learning. Link between them: clicking a tree node jumps to that step in simulation. |
| **Opponent response highlighting** | Show all possible opponent responses at each step, with optimal counter | Med | In the tree view, highlight which opponent responses the solver has accounted for. Users can click alternate opponent plays to see if the solution still works. |
| **Card input via click-select on a visual deck** | Faster, more intuitive, fewer errors than typing card codes | Med | Display a full deck, user clicks to assign cards to player 1 / player 2. Visual feedback on remaining cards. Much better UX than text input. |
| **Win guaranteed badge** | Clear "first player guaranteed win" / "second player guaranteed win" status with confidence | Low | Emphasize the mathematical certainty of the result. "必胜" (guaranteed win) is powerful messaging. |
| **Export/share solution** | Users can share interesting endgame puzzles with friends | Med | Shareable URL encoding the hand positions. Screenshot/export of the tree. Social sharing for Chinese platforms (WeChat). |
| **Preset classic endgame puzzles** | Built-in famous DDZ endgame problems to demonstrate the solver | Low | Curated set of 10-20 classic 残局 that DDZ players recognize. Serves as demo content and learning material. |
| **Dark mode** | Users studying endgames at night (common in Chinese gaming culture) | Low | Toggle. Respects prefers-color-scheme. |
| **Keyboard shortcuts for power users** | Speed up repeated analysis sessions | Low | Arrow keys to navigate tree, Enter to expand/collapse, Space to toggle step-by-step. |

## Anti-Features

Features to explicitly NOT build. These are traps that would waste time or dilute the product.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Three-player DDZ** | Exponentially larger search space. The game tree for 3 players is orders of magnitude larger. Would require backend compute. The two-player endgame is a tractable, well-defined problem that fits browser computation. | Stay focused on two-player endgames. This is a clean, solvable problem. |
| **AI opponent / real-time play** | This turns into a game, not a solver. DouZero already exists for this. It would consume all development effort and turn the project into a game engine. | Keep the tool as an analyzer. Input hands, get solution. |
| **User accounts / login** | Adds backend, auth, database. Completely unnecessary for a solver tool. Adds friction to first use. | Statelessness. All computation client-side. Optional localStorage for recent puzzles. |
| **Puzzle community / social features** | Leaderboards, comments, user-submitted puzzles -- these are social product features that require backend, moderation, and community management. Not what a solver tool needs. | Shareable URLs for individual puzzles. Optional curated preset puzzles. |
| **Reinforcement learning / neural network solver** | Massive overkill for two-player perfect-information endgame. Minimax is exact and provably correct. RL is approximate and requires training infrastructure. | Stick with minimax + alpha-beta. It is the right algorithm for this problem class. |
| **Real-time opponent hand detection (OCR)** | Screen reading from DDZ game apps. Requires native code, platform-specific logic, and raises ethical/legal questions. DouZero_For_HappyDouDiZhu already does this. | Manual card input is cleaner, more portable, and avoids all the issues. |
| **Backend / server** | Adds deployment cost, scaling concerns, and latency. The two-player endgame search space fits in browser computation. | Pure frontend + Web Worker. Zero backend. |
| **Card animation / elaborate visual effects** | Slows down the step-by-step replay. Users analyzing endgames want speed and clarity, not flashy animations. | Clean, instant transitions. Subtle highlighting, not animations. |

## Feature Dependencies

```
Card Input System
  |
  +---> Card Pattern Recognition (validates input, generates legal plays)
         |
         +---> Solver Engine (minimax + alpha-beta)
                |
                +---> Result Display (win/lose)
                |
                +---> Step-by-Step Simulation (requires solution path)
                |
                +---> Decision Tree Visualization (requires full game tree)
                       |
                       +---> Opponent Response Highlighting (requires tree)
                       |
                       +---> Export/Share (requires tree + state encoding)

Card Input System ---> Visual Card Display (rendering layer)
                        |
                        +---> Click-Select Deck Input (enhanced input)

Preset Puzzles ---> Card Input System (pre-fills hands)

Web Worker ---> Solver Engine (non-blocking execution)
```

**Critical dependency chain:** Card Input -> Pattern Recognition -> Solver Engine -> Result Display. Everything else branches off this spine.

## Feature Sizing

### MVP (Minimum Viable Product)
The smallest product that delivers the core value proposition: "input two hands, get the winning strategy."

| Feature | Est. Effort | Priority |
|---------|-------------|----------|
| Card input (text-based, both hands) | 1 day | P0 |
| Card pattern recognition (all standard types) | 3 days | P0 |
| Solver engine (minimax + alpha-beta) | 3 days | P0 |
| Visual card display | 2 days | P0 |
| Web Worker integration | 1 day | P0 |
| Result display (win/lose) | 0.5 day | P0 |
| Step-by-step simulation | 2 days | P1 |
| First/second player toggle | 0.5 day | P1 |
| Reset/undo input | 0.5 day | P1 |
| Computation timeout + progress | 1 day | P1 |
| Chinese language UI | 1 day | P0 |

**MVP total estimate:** ~12 days

### V1 (Complete Product)
MVP + the killer differentiators.

| Feature | Est. Effort | Priority |
|---------|-------------|----------|
| Interactive decision tree visualization | 5 days | P1 |
| Click-select visual deck input | 2 days | P1 |
| Opponent response highlighting | 2 days | P2 |
| Preset classic endgame puzzles | 1 day | P2 |
| Dark mode | 0.5 day | P2 |
| Keyboard shortcuts | 1 day | P3 |
| Responsive/mobile layout | 2 days | P2 |
| Shareable URLs | 1 day | P3 |
| Export (screenshot) | 1 day | P3 |

**V1 total estimate:** ~25 days

## MVP Recommendation

Prioritize:
1. **Complete card pattern recognition** -- the solver is useless if it mishandles any standard DDZ hand type. This is the hardest table stake and the most critical to get right.
2. **Working solver with clear result** -- users must see "先手必胜" (first player guaranteed win) or "后手必胜" quickly and reliably.
3. **Visual card display** -- text-based card codes are acceptable for input, but the output must look like cards.
4. **Step-by-step simulation** -- this is how users will actually consume the solution. Without it, the result is academic.

Defer:
- **Interactive tree visualization**: Complex to build, but it is the differentiation. Build the solver spine first, add tree visualization in V1. The tree view depends on the solver producing a complete game tree, which should be architecturally supported from the start even if the tree UI comes later.
- **Shareable URLs**: Nice-to-have. localStorage for recent puzzles is sufficient for MVP.
- **Preset puzzles**: A few hardcoded examples are cheap and valuable for demo purposes, but a curated puzzle library can wait.

## Domain-Specific Observations

### DDZ Endgame vs. Other Card Game Solvers

1. **Perfect information**: Unlike poker solvers (which deal with ranges and probabilities), DDZ endgames are perfect-information games. Both players' cards are known. This means the solution is exact (provably optimal), not probabilistic. The UI should emphasize certainty, not odds.

2. **Massive action space**: DDZ has ~15 distinct hand types with many possible plays per turn. The move generation (enumerating all legal plays from a hand) is itself a non-trivial algorithmic challenge. This is harder than chess-like games where legal moves are simpler to enumerate.

3. **Pass is a strategic option**: Unlike most games, passing your turn is a core strategic choice in DDZ. The solver must consider pass as a valid "move" in the game tree.

4. **Bomb escalation**: Bombs and rockets can be played on top of any hand type. This creates non-obvious branching in the game tree where the solver must check for bomb interruptions at every level.

5. **Cultural context**: DDZ players in China are familiar with 残局 challenges from apps like 欢乐斗地主. They expect a certain visual style (green felt table, card aesthetics) and interaction pattern (click cards, see result). The UX should feel familiar, not novel.

6. **Two-player simplification**: By restricting to two players (landlord vs. farmer), the search space becomes tractable for browser computation. This is the key design decision that makes the project feasible as a pure frontend app.

## Sources

- GitHub: [WZ403809264/doudizhu_solver](https://github.com/WZ403809264/doudizhu_solver) -- Direct competitor. C++ CLI endgame solver with benchmark data. Analyzed README for features and performance baselines.
- GitHub: [kwai/DouZero](https://github.com/kwai/DouZero) -- Most popular DDZ AI (2061+ stars on DouZero_For_HappyDouDiZhu variant). ICML 2021 paper. Reinforcement learning approach, not directly competing but defines the ecosystem.
- GitHub: [tian11111/doudizhu](https://github.com/tian11111/doudizhu) -- Wasm-based DDZ web implementation. Reference for web UI patterns and card display.
- GitHub: [coconut750750/pokai](https://github.com/coconut750750/pokai) -- Landlord AI using Monte Carlo simulation. Alternative algorithmic approach.
- GitHub ecosystem search: Surveyed 30+ repos under topics "doudizhu", "fight the landlord", "card game solver" -- no existing web-based endgame solver with tree visualization was found.
- Poker solver UX patterns (PioSolver, GTO+, SimplePostflop): Industry standard for interactive game tree visualization in card games. Training data, HIGH confidence on UX patterns.
- Confidence: MEDIUM overall. Web search was rate-limited, so could not verify current state of Chinese app store / WeChat mini-program ecosystem for competing products. The GitHub analysis is comprehensive but the consumer app space may have competing tools not on GitHub.
