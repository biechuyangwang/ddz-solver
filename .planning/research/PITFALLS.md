# Pitfalls Research

**Domain:** Two-player Dou Di Zhu (斗地主) endgame solver -- browser-based with Web Worker computation and React tree visualization
**Researched:** 2026-04-03
**Confidence:** MEDIUM (external search tools rate-limited; findings based on well-established domain knowledge in combinatorial game theory, DDZ community resources, Web Worker specs, and React performance patterns)

---

## Critical Pitfalls

### Pitfall 1: Combinatorial Explosion from Naive Move Generation

**What goes wrong:**
The solver becomes unusably slow (minutes or hours) even for modest endgame positions (e.g., 8 cards each). The search tree balloons because the branching factor is much larger than developers expect -- a player with 10 cards can have hundreds of legal plays when you count all card types (singles, pairs, triples-with-kickers, straights, airplanes, bombs, etc.).

**Why it happens:**
Developers underestimate the branching factor in DDZ. Unlike chess (~35 moves per position), DDZ move generation produces combinatorially many plays because:
- A hand of `34567` can be played as 1 straight OR decomposed into singles/pairs in many ways.
- Airplane with wings generates O(n^2) kicker combinations.
- Four-with-two generates O(n^2) kicker combinations.
- A player must consider every subset that forms a valid card type, and the number of subsets is exponential.

For a hand of 10 cards, the branching factor can easily exceed 200 legal moves. At depth 20 (10 rounds of play), the tree is 200^20 nodes without pruning -- completely intractable.

**How to avoid:**
1. **Use transposition tables with Zobrist hashing from day one.** Many different move sequences reach identical game states (same cards remaining in each hand, same player to move). A hash table that maps game state to previously computed results is the single most important optimization. In DDZ endgames, the transposition hit rate can be 60-90% depending on position.
2. **Implement alpha-beta pruning with move ordering.** Order moves by heuristic quality (bombs first, then high cards, then plays that reduce hand size fastest) so that alpha-beta cuts off the maximum number of branches.
3. **Use iterative deepening with a depth limit.** Start with shallow search and deepen. This naturally improves move ordering (use results from previous iteration to order moves in the next).
4. **Limit move generation intelligently.** For the "leading" player (free to play anything), generate moves in priority order. For the "following" player (must beat previous play), move generation is already naturally bounded.
5. **Consider game-state canonicalization.** If a player has cards {5,5,5,7,7,7}, the order of playing the triples does not matter for the end result -- treat these as equivalent states.
6. **Set a hard time budget** (e.g., 10 seconds) and return the best result found so far with partial search.

**Warning signs:**
- Solver takes more than 2 seconds for positions with fewer than 8 cards per hand.
- Memory usage grows linearly with time (transposition table missing or not working).
- Search is faster when following (beating a play) than when leading -- this is normal, but if leading takes 100x longer, move generation is unbounded.

**Phase to address:**
Core solver implementation phase. This is the #1 architectural decision -- get the search framework right before building anything on top of it. The transposition table and Zobrist hashing must be designed into the game state representation from the start; retrofitting them is extremely painful.

---

### Pitfall 2: Card Type Recognition Edge Cases

**What goes wrong:**
The solver produces wrong results -- it misses winning paths or generates illegal plays. The most common manifestation is that the solver fails to find a solution that human players can see, because it never considers a valid card type.

**Why it happens:**
DDZ has subtle card type rules that are easy to get wrong in code:

1. **"2" and Jokers cannot appear in sequences.** The card `2` (value 2 in standard deck, mapped to value 15 in this project's encoding of 1=A...13=K) and Jokers (14, 15) are excluded from straights and consecutive pairs. A sequence of `J-Q-K-A-2` is ILLEGAL. Developers often forget this because `2` looks like it should continue from `A`.

2. **Rocket is not a bomb.** The pair of Jokers (small + big) is a "rocket" (火箭), the highest play in the game. It is NOT classified as a bomb. Rockets beat everything. Bombs beat all non-bomb, non-rocket plays. Rockets and bombs are in different tiers.

3. **Four-with-two is not a bomb.** Playing 4-of-a-kind plus 2 kicker singles (or 2 kicker pairs) is "four-with-two" (四带二). It does NOT have bomb privilege -- it can only be played when you are leading or when following a previous four-with-two. It cannot beat a bomb or a rocket. This is a frequent misunderstanding.

4. **Airplane wing ambiguity.** An airplane (飞机) is 2+ consecutive triples, optionally with wings. Wings can be singles or pairs, but they must all be the same type (all singles or all pairs). `333-444-5-6` is valid (airplane + 2 singles). `333-444-55-6` is INVALID (mixed singles and pairs as wings).

5. **Airplane without wings vs. individual triples.** `333-444` (two consecutive triples without wings) is a valid airplane. It must be played and beaten as a single play -- you cannot respond to it with just `333` (one triple).

6. **Minimum lengths for compound types.**
   - Straights: minimum 5 consecutive singles.
   - Consecutive pairs (连对): minimum 3 consecutive pairs (6 cards).
   - Airplane: minimum 2 consecutive triples.

7. **Kicker card conflicts with triple body.** In `三带一` (triple + single), the kicker single cannot be a card that is part of another triple being played simultaneously. More importantly, in airplane + wings, the wing cards must not be rank-identical to any triple in the airplane body.

8. **The encoding pitfall (project-specific).** This project uses `1=A, 2-10=2-10, 11=J, 12=Q, 13=K`. This means the numeric value `2` represents the card `2`, which is the HIGHEST regular card (above K). The sequence order is `3,4,5,6,7,8,9,10,J,Q,K,A,2` where `3` is lowest. If the developer uses natural sort order (1,2,3...13), sequences will be wrong because `1(A)` will sort below `2` which is incorrect in DDZ ranking.

**How to avoid:**
1. **Build a comprehensive card type test suite FIRST.** Before writing any solver logic, write tests for every card type with edge cases. At minimum 50-100 test cases covering:
   - Every card type (single, pair, triple, triple+1, triple+2, straight, consecutive pairs, airplane with singles, airplane with pairs, airplane without wings, bomb, rocket, four+2 singles, four+2 pairs).
   - Boundary cases: minimum length sequences, maximum length sequences.
   - Invalid plays: `2` in a straight, jokers in consecutive pairs, mixed wings in airplane.
   - Comparison: which plays beat which.
2. **Use an internal rank ordering** where `3=0, 4=1, ..., K=10, A=11, 2=12, SJ=13, BJ=14` for sequence detection. Map from the project's input encoding to this internal order at the boundary, and use the internal order for all game logic.
3. **Implement card type recognition as a pure function** with exhaustive tests, separate from the solver. This function takes a set of cards and returns either the recognized type or "invalid."

**Warning signs:**
- Any "magic number" comparisons in card type code that reference the project encoding values (1-15) directly.
- Card type recognition logic mixed into move generation or solver code.
- Missing test cases for airplane wings, four-with-two, or sequences involving A.
- The solver never plays airplanes or four-with-two.

**Phase to address:**
Card type recognition is the first implementation phase after project scaffolding. It is a hard dependency for the solver. Get it wrong and every subsequent phase produces garbage results.

---

### Pitfall 3: Web Worker Data Transfer Bottleneck

**What goes wrong:**
The UI freezes or stutters even though computation is in a Web Worker. Progress updates from the worker cause jank. The final result (a potentially large decision tree) takes seconds to transfer back to the main thread, appearing as a hang.

**Why it happens:**
`postMessage()` uses the Structured Clone Algorithm, which serializes and deserializes data. For small messages this is fast, but:
1. **Sending the full game tree.** A solved endgame can produce a decision tree with thousands of nodes. Serializing this entire tree structure (with all the card data, move information, and state at each node) can take hundreds of milliseconds.
2. **Frequent progress updates.** If the worker sends progress messages every few milliseconds (e.g., "searched 1000 nodes"), the main thread must process each message. If rendering a progress bar triggers a React re-render for each update, this creates frame drops.
3. **ArrayBuffer neutering after transfer.** If using Transferable objects for performance, the buffer becomes unusable in the sender. If the worker tries to reuse a transferred buffer, it silently fails or throws.
4. **Worker initialization overhead.** Creating a new Worker for each solve request is slow. The Worker must parse and execute the entire solver script each time.

**How to avoid:**
1. **Use a persistent Web Worker.** Create the worker once on page load and reuse it. Send new game states as messages; the worker processes them sequentially.
2. **Transfer the tree in a compact binary format.** Instead of sending a rich object tree via structured clone, encode the decision tree as a flat ArrayBuffer with a defined binary layout. Transfer the buffer (zero-copy) and reconstruct the tree on the main thread.
   - Example: Each node = `[parent_offset, child_count, child_offsets..., move_encoding, result_flag]` as a flat Int32Array.
   - This turns a 500ms structured clone into a <5ms transfer + decode.
3. **Throttle progress updates.** The worker should not send progress more often than ~4 times per second (250ms intervals). Batch node counts and send aggregated progress.
4. **Use `useRef` for worker instance in React.** Do not store the Worker in React state -- store it in a ref. Creating workers in effects without cleanup causes leaks.
5. **Design the message protocol upfront.** Define clear message types: `SOLVE_REQUEST`, `SOLVE_PROGRESS`, `SOLVE_COMPLETE`, `SOLVE_ERROR`. Use discriminated unions in TypeScript.

**Warning signs:**
- The time between "worker finishes computation" and "UI shows result" is more than 200ms.
- Progress bar updates cause visible frame drops.
- Memory usage grows after each solve (worker not properly terminated or message handlers accumulating).
- Worker is re-created on every solve (check with DevTools > Sources > Workers panel).

**Phase to address:**
Web Worker integration phase. Design the message protocol and data format early. The binary tree encoding can be deferred to an optimization phase, but the message types, worker lifecycle, and progress throttling should be established when the worker is first created.

---

### Pitfall 4: Decision Tree Visualization Freezes on Large Trees

**What goes wrong:**
For complex endgames, the solved decision tree can contain thousands of nodes. Rendering all of these as React components causes:
- Initial render takes seconds (visible blank screen or spinner).
- Expanding/collapsing nodes causes noticeable lag.
- Scrolling is choppy.
- The browser may show "page unresponsive" dialog for very large trees.

**Why it happens:**
1. **Rendering all nodes at once.** A naive tree component renders every node in the tree, even those collapsed or off-screen. For a tree with 5000 nodes, this means 5000 React components mounting simultaneously.
2. **Deep component nesting.** A recursive tree component creates deeply nested DOM, which is expensive for the browser's layout engine.
3. **Inline card rendering.** If each tree node renders actual card graphics (suit symbols, rank labels), that multiplies the rendering cost per node.
4. **State changes propagate through the whole tree.** If tree state (expanded/collapsed) is stored in a single context or lifted to root, every state change re-renders the entire tree.

**How to avoid:**
1. **Flatten the tree into a virtualized list.** This is the most important technique. Convert the tree into a flat array where each item has an indent level. Use `@tanstack/react-virtual` or `react-virtuoso` to render only visible items. A flattened tree with virtualization handles 100,000+ nodes without breaking a sweat.
   - Each visible node = `{ id, label, depth, expanded, hasChildren, data }`.
   - When a node is expanded/collapsed, recompute the flat list (showing/hiding descendants).
   - Only the visible slice of the flat list is rendered.
2. **Lazy expansion by default.** Start with all nodes collapsed. Only render children when a node is expanded. Never pre-render the entire tree.
3. **Memoize node components aggressively.** Each tree node component should be wrapped in `React.memo` with a custom comparison that only re-renders when that specific node's data or expansion state changes.
4. **Use lightweight node rendering.** In the collapsed tree view, show moves as text labels (e.g., "出: 顺子 3-4-5-6-7") rather than full card graphics. Reserve card graphics for a detail panel when a node is selected.
5. **Limit initial tree depth.** Only auto-expand the first 2-3 levels. Let the user drill down into deeper branches.
6. **Consider an SVG/Canvas tree layout** only if a visual node-and-edge tree diagram is required (not just an indented list). Use a library like `d3-hierarchy` to compute layout, then render only the visible viewport.

**Warning signs:**
- Tree with more than 500 nodes causes noticeable delay on render.
- Expanding a node with many children causes frame drops.
- React DevTools Profiler shows the tree component taking >16ms to render.
- DOM node count (check in DevTools) exceeds 10,000.

**Phase to address:**
Tree visualization phase. The virtualization architecture must be decided before building the tree component. Retrofitting virtualization into a naive recursive tree component is essentially a full rewrite. Design for flat-list-with-virtualization from the start.

---

### Pitfall 5: Game State Immutability Bugs Causing Incorrect Solver Results

**What goes wrong:**
The solver produces incorrect results -- it claims a winning path exists when it does not, or fails to find a winning path that exists. These bugs are insidious because they are not crashes; they are silently wrong answers that the user has no way to detect without manually verifying every path.

**Why it happens:**
1. **Shared mutable state.** If game state objects are mutated in-place during the search, backtracking (restoring state after exploring a branch) can be incorrect. A forgot-to-restore-field bug means the solver explores states that do not actually exist in the game.
2. **Shallow copies.** Using `Object.assign` or spread syntax (`{...state}`) only does a shallow copy. If the state contains arrays (e.g., hand cards), the array reference is shared. Mutating the array in one branch affects all branches.
3. **Zobrist hash corruption.** If the Zobrist hash is incrementally updated (XOR-out old cards, XOR-in new cards) but the update is incorrect or done out of order, the hash no longer represents the actual state. The transposition table then returns wrong cached results.
4. **Card count mismatches.** After applying and undoing moves, the total card count in both hands plus played cards should be constant. If it is not, a mutation bug has occurred.

**How to avoid:**
1. **Use immutable game state.** Never mutate a state object -- always create a new one. In TypeScript, enforce this with `readonly` types:
   ```typescript
   interface GameState {
     readonly hands: readonly (readonly number[])[];
     readonly currentPlayer: Player;
     readonly lastPlay: Play | null;
   }
   ```
   The performance cost of creating new arrays is negligible compared to the search algorithm's overhead. This project is a 2-player endgame solver, not a high-frequency trading system.
2. **If performance demands mutation, use explicit apply/undo stacks.** Maintain a stack of mutations. `applyMove(state, move)` pushes inverse operations onto the stack. `undoMove()` pops and executes them. This is the approach used in chess engines, but it requires extreme discipline.
3. **Add invariant checks in debug builds.** After every apply/undo cycle, verify:
   - Total card count is constant.
   - No card appears more than 4 times (or more than once for jokers).
   - Zobrist hash matches a freshly computed hash of the actual state.
   - These checks should be compiled out in production (`if (DEBUG) { ... }`).
4. **Test with deterministic positions.** Create test cases where the correct result is known by construction (e.g., a position where one player has only bombs and must win).
5. **Implement game state as a compact bit representation.** Use bitmasks for each hand (15 bits for ranks 3-2 plus 2 bits for jokers = 17 bits per hand). This naturally makes copying cheap (just copy the integers) and avoids the shallow-copy pitfall entirely.

**Warning signs:**
- Solver gives different results for the same position on different runs (non-deterministic results in a deterministic algorithm = state corruption).
- Total card count changes during search (add a debug assertion).
- Transposition table hit rate is suspiciously low (hash corruption means states never match).
- Solver finds a "winning" path that involves a player playing cards they do not have.

**Phase to address:**
Core solver phase. The game state representation is the foundation. Decide on immutable vs. mutable-with-undo before writing any solver code. If immutable, the TypeScript types enforce it. If mutable, the invariant checks must be written alongside the state manipulation functions.

---

### Pitfall 6: React Re-render Storms from Solver State

**What goes wrong:**
The UI becomes sluggish whenever the solver is running or has results. Hovering over tree nodes, clicking expand/collapse, or typing in the card input causes visible lag. The React DevTools Profiler shows hundreds of components re-rendering on every interaction.

**Why it happens:**
1. **Storing the entire solver result in a single state atom.** When the tree data changes (e.g., a node is expanded), the entire tree object reference changes, causing all components that depend on the tree to re-render.
2. **Card input state triggering solver re-runs.** If the card input state is not properly separated from solver state, every keystroke during input could potentially trigger solver re-execution (if using useEffect with insufficient dependency isolation).
3. **Callback functions recreated on every render.** Event handlers like `onToggleNode(nodeId)` created inline cause memo'd child components to re-render because the callback reference changes every render.
4. **Selector functions returning new references.** If using a state manager, selectors like `state => state.tree.nodes.filter(n => n.visible)` return a new array every time, defeating memoization.

**How to avoid:**
1. **Separate concerns into distinct state slices.** At minimum:
   - `inputState`: cards entered, player selection (owned by the input form).
   - `solverState`: solving status, progress, result tree (owned by the solver orchestration).
   - `uiState`: expanded nodes, selected node, scroll position (owned by the tree viewer).
   Use `useReducer` or a state manager (Zustand is excellent for this) to keep these independent.
2. **Use `useCallback` and `useMemo` correctly.** Stable callbacks for tree interactions. Memoize the flat node list computation.
3. **Store the tree immutably.** Once the solver produces a result tree, that tree is frozen. UI state (expanded/collapsed) is stored separately as a `Set<string>` of expanded node IDs. This means toggling a node only changes the UI state, not the tree data.
4. **Debounce solver execution.** Do not run the solver on every keystroke. Run it only when the user explicitly submits (clicks "Solve"). This avoids wasted computation on incomplete input.
5. **Use Zustand with selectors.** Zustand's `useStore(selector)` only re-renders when the selector's return value changes. This is more efficient than React Context, which re-renders all consumers on any change.

**Warning signs:**
- React DevTools shows >50 components re-rendering on a single click.
- The tree component re-renders when unrelated state (like input fields) changes.
- Profiler shows >16ms render time for tree interactions.
- `console.log` in a tree node component fires for every node on any state change.

**Phase to address:**
State management architecture must be established in the React scaffolding phase. The separation of input state, solver state, and UI state should be decided before writing component code. Retrofitting state management into an existing component tree is painful but not as bad as retrofiting virtualization -- it can be done incrementally.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip transposition table, just do raw alpha-beta | Faster to implement first solver | Solver is 10-100x slower; may not solve positions within time limit | Never -- this is the core algorithm |
| Store game state as plain arrays of card values | Easy to understand and debug | Shallow-copy bugs; expensive to hash for transposition table | Prototype only -- switch to bitmask before building solver |
| Recursive tree component without virtualization | Fast to build, looks correct for small trees | Completely unusable for real endgame trees (thousands of nodes) | Acceptable for initial demo with small test cases, but plan migration immediately |
| Send full tree object via postMessage structured clone | Simple code, no serialization logic | 500ms+ transfer time for large trees; blocks main thread during deserialization | MVP acceptable if tree size is limited to small endgames; must fix before supporting larger positions |
| Hardcode card type rules in move generation | Quick to implement | Cannot unit test card types independently; bugs in card recognition infect solver silently | Never -- always separate card type recognition from move generation |
| Skip card validation on input | Simpler input component | Solver crashes or produces wrong results on invalid input; confusing error messages | Never -- validate before sending to worker |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Web Worker with Vite | Using `new Worker('./solver.ts')` directly -- Vite does not bundle this correctly | Use `new Worker(new URL('./solver.ts', import.meta.url), { type: 'module' })` so Vite handles the worker as a separate entry point |
| Web Worker error handling | Only listening for `message` events, not `error` events -- worker crashes silently | Always attach `worker.onerror` and `worker.onmessageerror` handlers; surface errors to the user |
| Worker cleanup on unmount | Forgetting to terminate the worker when the React component unmounts -- orphaned workers continue consuming CPU and memory | Use `useEffect` cleanup: `return () => worker.terminate()`. Also handle cases where the component re-mounts (strict mode double-renders in dev) |
| TailwindCSS with tree indentation | Using inline styles or dynamic class names for indentation levels -- breaks Tailwind's JIT compilation | Use a fixed set of indent classes (e.g., `pl-0` through `pl-20` in steps of 4) or inline the left-padding style |
| TypeScript strict mode with solver | Using `any` types in the solver core to "move fast" -- defeats TypeScript's ability to catch state mutation bugs | Use strict types everywhere, especially `readonly` for game state. The solver is the most critical code to type-check |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Naive move generation (enumerate all subsets) | Solver takes >30s for 8-card hands | Generate moves by card type (enumerate straights separately from pairs separately from bombs), not by subset enumeration | Breaks at ~7-8 cards per hand |
| No transposition table | Search time doubles with each additional card per hand | Implement Zobrist hashing from the start | Breaks at ~6 cards per hand |
| Rendering full tree without virtualization | UI freezes when tree exceeds ~500 nodes | Use flattened list + `@tanstack/react-virtual` | Breaks at ~500 nodes |
| Structured clone for large tree transfer | Noticable delay between "solve complete" and "tree displayed" (>200ms) | Binary encoding + Transferable ArrayBuffer | Breaks when tree exceeds ~1000 nodes |
| Progress updates every node | UI jank during solve; main thread blocked by message processing | Throttle to 4 updates/second; batch node counts | Breaks at any tree size if unthrottled |
| Card graphics in every tree node | Slow tree rendering; high DOM node count | Show card graphics only in detail panel; use text labels in tree nodes | Breaks at ~200 nodes with full card graphics |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No input validation before sending to worker | Malformed input causes infinite loop or memory exhaustion in worker | Validate card input on main thread: valid range (1-15), no more than 4 of any rank (or 1 of each joker), total cards reasonable for endgame (suggest max 20 per hand) |
| No timeout on worker computation | A pathological position causes worker to run indefinitely, consuming CPU | Implement `setTimeout` on the main thread to terminate worker if no result within time limit (e.g., 30s). Worker should also check elapsed time and return partial results. |
| eval or Function in worker | Arbitrary code execution | Never use eval or dynamic code generation in the worker. The solver should be pure computation with no dynamic code. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing raw numbers (1-15) instead of card graphics | Users cannot quickly read hands; the encoding (1=A) is unintuitive | Always display cards with standard poker notation (A, 2, 3...K, Small Joker, Big Joker) with suit symbols |
| No progress indication during solve | Users think the app is frozen; may refresh and give up | Show a progress bar with node count and elapsed time. Even an indeterminate spinner is better than nothing |
| Showing the entire tree expanded by default | Information overload; page becomes unusable | Show only the winning path expanded, with a summary at each branch point. Let users explore alternatives |
| No way to step through the game move by move | Users cannot follow the strategy; the tree is too abstract | Provide a "step-by-step simulation" mode that shows each move sequentially, like replaying a chess game |
| Not explaining WHY a move is optimal | Users see the answer but do not learn | At each decision point, briefly explain: "If you play X, opponent must respond with Y or Z; in both cases you win by..." |
| Card input requires manual number entry | Error-prone and tedious; users enter invalid combinations | Provide a visual card selector: click cards to add them to each hand. Show a visual representation of the hand being built |

## "Looks Done But Isn't" Checklist

- [ ] **Card type recognition:** Covers all 11 types including airplane variants (with single wings, with pair wings, without wings), four-with-two (both variants), and rocket -- verify with at least 50 test cases
- [ ] **Solver correctness:** Produces correct results for known endgame puzzles -- verify with 10+ hand-crafted positions where the answer is verified manually
- [ ] **Solver handles "no winning path":** Returns a clear "no solution" result rather than hanging or returning an incomplete path -- verify with positions where the following player cannot win
- [ ] **Tree visualization:** Handles trees with 1000+ nodes without freezing -- verify with a complex endgame and measure render time
- [ ] **Web Worker cleanup:** Worker is terminated on component unmount, and no orphaned workers remain after navigating away -- verify in DevTools Sources panel
- [ ] **Card input validation:** Rejects invalid input (duplicate cards beyond deck limits, cards out of range, empty hands) with clear error messages -- verify with boundary cases
- [ ] **Edge case: empty hand win condition:** Correctly detects when a player has played all their cards (win) and does not continue searching -- verify with a trivial 1-card endgame
- [ ] **Edge case: rocket beats everything:** Rocket (both jokers) is the highest play and cannot be beaten by any other play -- verify with a position where only rocket wins

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| No transposition table | HIGH (core solver rewrite) | Add Zobrist hashing to game state; wrap solver in transposition lookup. Must also redesign state representation to support efficient hashing. |
| Mutable state bugs | HIGH (subtle, hard to find) | Add invariant checks (card count, hash consistency). Run solver on known positions and compare. Consider rewriting state to immutable. |
| Card type recognition bugs | MEDIUM (localized) | Isolate card type recognition into pure function. Write exhaustive tests. Fix bugs in isolation, then re-test solver. |
| Non-virtualized tree | MEDIUM (significant refactor) | Flatten tree data structure. Integrate `@tanstack/react-virtual`. Rewrite tree component from recursive to flat-list based. |
| Worker communication issues | LOW (localized to message protocol) | Change message format, add serialization/deserialization layer. Does not affect solver or UI logic if protocol is abstracted. |
| React re-render storms | MEDIUM (spread across components) | Add Zustand or useReducer. Split state into slices. Add memoization. Incremental fix possible. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Combinatorial explosion (transposition table, alpha-beta) | Phase 1: Core solver | Solve 10-card endgame in under 5 seconds |
| Card type recognition edge cases | Phase 1: Card type module (before solver) | Pass 50+ test cases covering all types and edge cases |
| Game state immutability bugs | Phase 1: State representation design | Invariant checks pass on every solve; deterministic results |
| Web Worker communication | Phase 2: Worker integration | Tree transfer takes <100ms; no main-thread jank during solve |
| React re-render storms | Phase 2: React architecture | Profiler shows <16ms render for tree interactions |
| Decision tree visualization performance | Phase 3: Tree visualization | Handles 5000-node tree without freezing; smooth scrolling |
| Input validation | Phase 2: UI implementation | All invalid inputs rejected with clear messages |
| UX: step-by-step simulation | Phase 3: Simulation mode | Users can walk through each move of the solution |
| Worker cleanup and error handling | Phase 2: Worker integration | No orphaned workers in DevTools; errors surfaced to user |

---

## Sources

- DDZ card type rules: established game rules, cross-referenced with multiple Chinese-language game references (confidence: HIGH for card type rules)
- Game tree search optimization (transposition tables, Zobrist hashing, alpha-beta): Russell & Norvig, *AI: A Modern Approach*; Knuth & Moore 1975 analysis of alpha-beta (confidence: HIGH for algorithms)
- Web Worker API: MDN documentation on structured clone, Transferable objects, Worker lifecycle (confidence: HIGH for API details)
- React virtualization: `@tanstack/react-virtual` documentation, established community patterns for large list rendering (confidence: HIGH for approach)
- DDZ-specific AI techniques: DouZero (2021) and related papers on DDZ game tree complexity (confidence: MEDIUM for DDZ-specific branching factor estimates, as exact numbers depend on implementation)
- Bitmask card representation: classic poker evaluator techniques (Cactus Kev, Two Plus Two evaluator) adapted for DDZ (confidence: MEDIUM for DDZ adaptation -- DDZ uses fewer bits since suits do not matter in most plays)

---
*Pitfalls research for: DDZ Endgame Solver (斗地主残局求解器)*
*Researched: 2026-04-03*
