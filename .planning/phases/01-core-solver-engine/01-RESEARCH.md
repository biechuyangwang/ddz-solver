# Phase 1: Core Solver Engine - Research

**Researched:** 2026-04-03
**Domain:** Game tree search, combinatorial move generation, DDZ (Dou Di Zhu) card game rules
**Confidence:** HIGH

## Summary

This phase builds a complete two-player DDZ endgame solver using minimax search with alpha-beta pruning. The core algorithm is well-established in the competitive DDZ solver community. I studied three open-source reference implementations (Python, C++, Java) on GitHub and found consistent patterns: count-based hand encoding, exhaustive move generation with type-based filtering, depth-first minimax search, and memoization via transposition tables.

The primary technical challenge is **move generation for airplane with wings** -- generating all valid kicker combinations for consecutive-trio hands. This is the most combinatorially complex hand type and the specific concern flagged in STATE.md. The reference implementations solve it by: (1) identifying consecutive trios, (2) computing available kicker cards (excluding trio ranks), and (3) generating all C(n, k) combinations where n = number of trio groups and k = kickers needed. The `itertools.combinations` approach used by `julywind168/doudizhu_endgame` is the cleanest reference.

A secondary challenge is the **decision tree representation** -- the solver must capture the full game tree (not just the winning path) per D-06. This means the tree node structure needs to store enough information for Phase 3 visualization without bloating Phase 1's computation. A compact representation storing only move + result per node, with child arrays, is recommended.

**Primary recommendation:** Use a count-based encoding (array of 15 counters, one per card value) for game state, exhaustive move generation by hand type, negamax with alpha-beta for search, and a simple object-graph tree for the decision tree. No external libraries needed -- this is pure algorithmic code.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Claude decides the top-level API shape (function-based vs class-based) based on implementation needs
- **D-02:** Input format: two number arrays representing each player's hand, plus options (timeBudget, firstPlayerIsUser)
- **D-03:** Output includes: win/loss result, decision tree, and search statistics (nodes explored, time, transposition hits)
- **D-04:** Solver returns a flat "not winnable" result when no guaranteed winning strategy exists -- `{ winnable: false, bestMove: null }`
- **D-05:** No best-effort strategy computation for losing positions -- keep it simple and honest
- **D-06:** Full tree -- include every possible opponent response for each winning move
- **D-07:** Matches SOLV-08 requirement: "captures all winning paths"
- **D-08:** Claude decides node data structure (compact vs full state) based on memory/performance tradeoff

### Claude's Discretion
- Top-level solver API shape (function vs class)
- Decision tree node data structure
- Bitmask encoding details
- Move generation algorithm specifics
- Alpha-beta pruning move ordering heuristic
- Transposition table implementation details
- Internal test case selection

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SOLV-01 | Bitmask game state representation (17-bit counters per hand for values 1-15) | Count-based encoding: array of 15 uint8 counters. Each index 0-14 maps to card values 1-15. Value 0 = no cards of that rank, 1-4 = count. Bitmask per rank for fast pattern detection. |
| SOLV-02 | Recognize all 14 standard DDZ hand types | Complete enumeration documented below with detection rules. Airplane wings require C(n,k) combination generation for kickers. |
| SOLV-03 | Move generator enumerates all legal plays for leading and following modes | Two generation modes: (1) leading mode = all possible plays from hand, (2) following mode = only plays that beat the last play, plus PASS. |
| SOLV-04 | Minimax search with alpha-beta pruning computes optimal play | Negamax formulation recommended (simpler code, same result). Alpha-beta with move ordering (bombs first, then by main rank descending). |
| SOLV-05 | Transposition table with Zobrist hashing for state deduplication | Zobrist hashing: pre-compute random 64-bit values for each (position, card_value, count) triple. XOR them together for a hash. Replace-table with 2^20 slots is standard. |
| SOLV-06 | Pass handled as valid move in game tree | PASS is a valid response when following. Two consecutive passes transfer play control (the next player leads freely). Critical edge case. |
| SOLV-07 | Time budget enforcement (default 10s, returns best partial result) | Use performance.now() at node boundaries. If budget exceeded, return current best estimate with a "timed out" flag. Requires iterative deepening or early termination. |
| SOLV-08 | Decision tree built during search captures all winning paths | Tree nodes store: move played, remaining hands (or delta), result (win/loss/unknown), children array. Build bottom-up during search. |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 6.0.x | Type safety for solver logic | Specified by user. Strict typing prevents bugs in complex search logic. Card values, hand types, moves all benefit from enums and discriminated unions. |
| Vitest | 4.1.x | Unit testing for solver correctness | Specified in project stack. Every hand type rule, move generation path, and search outcome needs tests. Critical for a solver. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | - | No external runtime dependencies for solver | The solver is pure algorithmic code. No libraries needed. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual bit operations | BigInt for state encoding | BigInt has overhead for small values. Manual uint32 bitmasks are faster. For two-player endgame (max 10 cards per hand), simple counter arrays are sufficient. |
| Object-graph tree | Flat array tree | Flat array saves memory but makes parent-child traversal harder. Object-graph is clearer for Phase 3 consumption. |
| Zobrist hashing | String-based hashing (like reference implementations) | String hashing is simpler but slower. Zobrist is O(n) where n = hand size. For <10 cards per hand, difference is small, but Zobrist scales better. |

**Installation:**

```bash
npm install -D vitest
```

No runtime dependencies needed for this phase. The solver is pure TypeScript.

**Version verification:**

```bash
npm view vitest version
# Expected: 4.1.x or later
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  solver/
    types.ts          # Card values, hand types, move types, game state types
    encoding.ts       # Hand encoding, state representation utilities
    hand-types.ts     # Detection and classification of all 14 DDZ hand types
    move-gen.ts       # Move generation (leading + following modes)
    search.ts         # Negamax with alpha-beta pruning
    transposition.ts  # Zobrist hashing + transposition table
    tree.ts           # Decision tree construction
    solver.ts         # Top-level solver API (orchestrates everything)
    constants.ts      # Card value mappings, hand type enum, limits
  __tests__/
    solver/
      hand-types.test.ts
      move-gen.test.ts
      search.test.ts
      encoding.test.ts
      solver.test.ts
```

### Pattern 1: Count-Based Hand Encoding

**What:** Represent a player's hand as an array of 15 counters, where index `i` stores how many cards of value `i+1` the player holds.

**When to use:** This is the primary game state representation throughout the solver.

**Example:**

```typescript
// Card values: 1=A, 2=2, 3=3, ..., 13=K, 14=Small Joker, 15=Big Joker
// Hand encoding: counts[v-1] = number of cards with value v
type Hand = number[]; // length 15, counts[0] = # of Aces, ..., counts[14] = # of Big Jokers

// Example: Hand [A, A, 3, 5, 5] encoded as:
// counts = [2, 0, 1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
//           A   2   3   4   5   6   7   8   9  10   J   Q   K  sJ  bJ

function createHand(cards: number[]): Hand {
  const counts = new Array(15).fill(0);
  for (const card of cards) {
    counts[card - 1]++;
  }
  return counts;
}
```

### Pattern 2: Move Representation

**What:** Each move is a typed object with hand type, main rank (for comparison), and the actual cards played.

**Example:**

```typescript
enum HandType {
  SINGLE = 'SINGLE',
  PAIR = 'PAIR',
  TRIPLE = 'TRIPLE',
  TRIPLE_SINGLE = 'TRIPLE_SINGLE',
  TRIPLE_PAIR = 'TRIPLE_PAIR',
  STRAIGHT = 'STRAIGHT',
  CONSECUTIVE_PAIRS = 'CONSECUTIVE_PAIRS',
  AIRPLANE = 'AIRPLANE',
  AIRPLANE_SINGLES = 'AIRPLANE_SINGLES',
  AIRPLANE_PAIRS = 'AIRPLANE_PAIRS',
  FOUR_TWO_SINGLES = 'FOUR_TWO_SINGLES',
  FOUR_TWO_PAIRS = 'FOUR_TWO_PAIRS',
  BOMB = 'BOMB',
  ROCKET = 'ROCKET',
  PASS = 'PASS',
}

interface Move {
  type: HandType;
  mainRank: number;  // The primary rank for comparison (e.g., trio rank for TRIPLE_SINGLE)
  length: number;    // Number of cards in the move (for straights/airplanes, the sequence length)
  cards: number[];   // The actual card values played (e.g., [5, 5, 5] for triple 5s)
}

// PASS is a special move:
const PASS_MOVE: Move = {
  type: HandType.PASS,
  mainRank: 0,
  length: 0,
  cards: [],
};
```

### Pattern 3: Negamax Search with Alpha-Beta

**What:** Use negamax formulation where the return value is always from the perspective of the current player (positive = current player wins).

**Example:**

```typescript
function negamax(
  myHand: Hand,
  opponentHand: Hand,
  lastMove: Move | null,   // null means we are leading (free play)
  passCount: number,        // consecutive passes (0, 1, or 2)
  alpha: number,
  beta: number,
  depth: number,
  deadline: number,         // performance.now() deadline
  tt: TranspositionTable,
  treeBuilder: TreeBuilder,
): number {
  // Terminal states
  if (isHandEmpty(myHand)) return 1;   // I won
  if (isHandEmpty(opponentHand)) return -1; // Opponent won

  // Time budget check (every N nodes to reduce overhead)
  if (performance.now() > deadline) return 0; // unknown, timed out

  // Transposition table lookup
  const key = computeHash(myHand, opponentHand, lastMove, passCount);
  const cached = tt.get(key);
  if (cached !== undefined) return cached;

  // Generate moves based on mode (leading vs following)
  const moves = lastMove === null || passCount >= 2
    ? generateLeadingMoves(myHand)
    : generateFollowingMoves(myHand, lastMove);

  let best = -Infinity;
  for (const move of moves) {
    const newMyHand = applyMove(myHand, move);
    // Pass handling: if I pass, opponent faces the same lastMove
    const newLastMove = move.type === HandType.PASS ? lastMove : move;
    const newPassCount = move.type === HandType.PASS ? passCount + 1 : 0;

    // Swap perspective: opponent becomes "me"
    const val = -negamax(
      opponentHand, newMyHand,  // swap hands
      newLastMove, newPassCount,
      -beta, -alpha,
      depth + 1, deadline, tt, treeBuilder,
    );

    best = Math.max(best, val);
    alpha = Math.max(alpha, val);
    if (alpha >= beta) break; // prune
  }

  tt.set(key, best);
  return best;
}
```

### Pattern 4: Decision Tree Construction

**What:** Build the tree as a side effect of the search. Each explored node becomes a tree node. The tree is built incrementally.

**Example:**

```typescript
interface TreeNode {
  id: string;               // Unique identifier for tree visualization
  move: Move;               // The move played to reach this state
  result: 'win' | 'loss' | 'unknown';
  isPlayerMove: boolean;    // true if the move was made by the first player
  children: TreeNode[];
  // Compact state -- store only what's needed for Phase 3
  remainingCards?: number;  // Total cards remaining in player's hand
}

// Build tree during search:
function searchWithTree(
  myHand: Hand,
  opponentHand: Hand,
  lastMove: Move | null,
  passCount: number,
  parentNode: TreeNode,
  isPlayerMove: boolean,
): number {
  const moves = generateMoves(/* ... */);
  let best = -Infinity;

  for (const move of moves) {
    const childNode: TreeNode = {
      id: generateId(),
      move,
      result: 'unknown',
      isPlayerMove,
      children: [],
    };
    parentNode.children.push(childNode);

    const val = -searchWithTree(/* recursive call with swapped hands */);
    childNode.result = val > 0 ? 'win' : 'loss';
    best = Math.max(best, val);
  }

  return best;
}
```

### Anti-Patterns to Avoid

- **Storing full hand state in every tree node:** Bloats memory for large trees. Store only the move played and let Phase 3 reconstruct state by replaying the path from root. The root node stores the initial hands.
- **Using string keys for transposition table (like reference implementations):** `str((my_pokers, enemy_pokers, last_hand))` works but is slow. Use Zobrist hashing or a compact numeric encoding.
- **Generating all C(n,k) kicker combinations naively for airplane+wings:** For large kicker pools, this creates combinatorial explosion. Limit by only generating kickers from available cards (excluding trio ranks), and prune early.
- **Treating PASS as "no move":** PASS is a valid move that must be generated and explored in the game tree. Two consecutive PASSes transfer play control. Missing this breaks the solver.
- **Forgetting the "no 2/jokers in sequences" rule:** Straights, consecutive pairs, and airplane trios can only use values 1(A) through 13(K). Value 2 and jokers are excluded from sequential types.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Combinatorial kicker generation for airplane+wings | Custom nested loops | `combinations()` pattern from Python `itertools` (port to TS) | The C(n,k) pattern is well-defined. A generic `combinations(arr, k)` utility avoids off-by-one bugs. |
| Transposition table hash map | Custom hash map from scratch | JavaScript `Map` with numeric keys | `Map` has O(1) average lookup. For a two-player endgame with <10 cards per hand, the table fits in memory. |

**Key insight:** For a two-player endgame solver with at most 10 cards per hand, the search space is manageable (thousands to low millions of nodes). No exotic data structures are needed. Keep it simple and correct.

## Common Pitfalls

### Pitfall 1: Airplane Wings Kicker Generation

**What goes wrong:** Generating invalid kicker combinations for airplane+singles or airplane+pairs. Kickers must not duplicate trio ranks, and pair kickers must be actual pairs.
**Why it happens:** The kicker pool must exclude the trio ranks, then generate C(k, n) combinations (singles) or C(p, n) pair combinations (pairs) from the remaining cards. It is easy to forget to exclude trio ranks from the kicker pool.
**How to avoid:** After identifying the consecutive trio sequence, compute `availableSingles = ranks where count >= 1 AND rank not in trioRanks`. For pairs, `availablePairs = ranks where count >= 2 AND rank not in trioRanks`. Then generate combinations from these filtered pools.
**Warning signs:** Test cases where the solver suggests playing an airplane with a kicker that is the same rank as one of the trios.

### Pitfall 2: Pass Transfer Logic

**What goes wrong:** Incorrectly tracking when play control transfers after consecutive passes.
**Why it happens:** In DDZ, when two players both pass consecutively, the next player gets free lead (can play anything). The state must track not just "last move" but "who played it" and "how many consecutive passes."
**How to avoid:** Track a `passCount` (0, 1, or 2). When passCount reaches 2, the current player leads freely (lastMove is reset to null). The passCount resets to 0 whenever any non-PASS move is played.
**Warning signs:** Solver gets stuck in infinite loops, or fails to find winning moves that require passing strategically.

### Pitfall 3: Bomb and Rocket Ordering

**What goes wrong:** Rockets (both jokers) not treated as the highest "bomb," or bombs/rockets not allowed to beat non-bomb hands.
**Why it happens:** In DDZ, bombs beat any non-bomb hand, and rockets beat everything (including bombs). The move comparison logic must handle this hierarchy separately from same-type comparisons.
**How to avoid:** Implement `canBeat(lastMove, currentMove)` with explicit hierarchy: (1) Rockets beat everything, (2) Bombs beat non-bomb non-rocket, (3) Same type compares by mainRank.
**Warning signs:** Solver fails to find winning strategies that rely on bomb/rocket timing.

### Pitfall 4: Sequential Hand Value Ranges

**What goes wrong:** Including value 2 (index 1 in our encoding) or jokers (indices 13-14) in straights, consecutive pairs, or airplane trios.
**Why it happens:** The sequential types (straight, consecutive pairs, airplane) only allow values A(1) through K(13). Value 2 and jokers break the sequence. This is a DDZ-specific rule.
**How to avoid:** In `createStraight()`, `createConsecutivePairs()`, and `createAirplane()`, only iterate from index 0 (A) to index 12 (K). Never include index 1 (value 2) or indices 13-14 (jokers) in sequential patterns.
**Warning signs:** Test case where solver plays a "straight" like J-Q-K-A-2, which is illegal.

### Pitfall 5: Four+Two Kickers Including Bomb Components

**What goes wrong:** When generating four+two-singles or four+two-pairs moves, the code might try to use cards from the four-of-a-kind itself as kickers.
**Why it happens:** After removing the four cards, the remaining hand might have cards that overlap with the four's rank if the counting is done wrong.
**How to avoid:** When generating four+two kickers, first remove the four-of-a-kind from the hand, then generate kicker combinations from the remaining cards. Never use cards from the main body as kickers.
**Warning signs:** Move generation produces a "four+two-singles" with 6 cards total but one of the "singles" has the same rank as the four.

### Pitfall 6: Decision Tree Memory for Large Game Trees

**What goes wrong:** Building a full decision tree for a position with many branches causes memory issues.
**Why it happens:** Per D-06, the tree must include ALL opponent responses for each winning move. If the first player has a winning move and the opponent has 20 possible responses to it, each of those branches generates a subtree. For 10-card hands, trees can reach thousands of nodes.
**How to avoid:** (1) Use compact node representation -- store only the move and a result flag, not the full hand state. (2) Consider building the tree lazily or pruning proven-loss branches. (3) For very large trees, the time budget (10s) naturally limits depth.
**Warning signs:** Node count exceeds 50,000 or memory usage spikes during search.

### Pitfall 7: Transposition Table Collisions

**What goes wrong:** Two different game states hash to the same key, causing incorrect cached results.
**Why it happens:** Zobrist hashing uses XOR which can produce collisions. For a two-player endgame, the state space is small enough that a well-sized table (2^20 entries) should have minimal collisions, but zero-collision guarantees require more sophisticated approaches.
**How to avoid:** Use 64-bit hash values (JavaScript BigInt or two 32-bit numbers). Store the full hash key in the table entry and verify on lookup. Do not overwrite entries with different keys -- use replacement strategies (always replace, or depth-preferred).
**Warning signs:** Solver gives incorrect results for positions that should be solvable, especially after long search sessions.

## Code Examples

### Complete DDZ Hand Type Detection

All 14 standard hand types with their detection rules:

```typescript
// Card encoding: 1=A, 2=2, 3=3, ..., 13=K, 14=Small Joker, 15=Big Joker
// Sequential types only use values 1(A) through 13(K) -- NO 2 or jokers

type HandType =
  | 'SINGLE'           // 1 card
  | 'PAIR'             // 2 same rank
  | 'TRIPLE'           // 3 same rank
  | 'TRIPLE_SINGLE'    // 3+1
  | 'TRIPLE_PAIR'      // 3+2 (pair)
  | 'STRAIGHT'         // 5+ consecutive (A-K range only)
  | 'CONSECUTIVE_PAIRS' // 3+ consecutive pairs (A-K range only)
  | 'AIRPLANE'         // 2+ consecutive triples (A-K range only)
  | 'AIRPLANE_SINGLES' // consecutive triples + N singles
  | 'AIRPLANE_PAIRS'   // consecutive triples + N pairs
  | 'FOUR_TWO_SINGLES' // 4 + 2 different singles
  | 'FOUR_TWO_PAIRS'   // 4 + 2 different pairs
  | 'BOMB'             // 4 same rank
  | 'ROCKET';          // Small Joker + Big Joker

// Key constraints:
// - STRAIGHT: min length 5, values 1-13 only (no 2, no jokers)
// - CONSECUTIVE_PAIRS: min 3 consecutive pairs, values 1-13 only
// - AIRPLANE: min 2 consecutive triples, values 1-13 only
// - AIRPLANE_SINGLES: kicker singles can be any rank except trio ranks
// - AIRPLANE_PAIRS: kicker pairs can be any rank except trio ranks
// - ROCKET is distinct from BOMB (rocket = both jokers, bomb = four same rank)
// - BOMB beats any non-bomb; ROCKET beats everything
```

### Move Generation for Leading Mode

```typescript
function generateLeadingMoves(hand: Hand): Move[] {
  const moves: Move[] = [];

  // Singles
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 1) moves.push({ type: 'SINGLE', mainRank: v, cards: [v + 1] });
  }

  // Pairs
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 2) moves.push({ type: 'PAIR', mainRank: v, cards: [v + 1, v + 1] });
  }

  // Triples, Triple+Single, Triple+Pair
  for (let v = 0; v < 15; v++) {
    if (hand[v] >= 3) {
      moves.push({ type: 'TRIPLE', mainRank: v, cards: [v + 1, v + 1, v + 1] });
      // Triple+Single: any single from remaining cards
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 1) {
          moves.push({ type: 'TRIPLE_SINGLE', mainRank: v, cards: [v+1, v+1, v+1, k+1] });
        }
      }
      // Triple+Pair: any pair from remaining cards
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 2) {
          moves.push({ type: 'TRIPLE_PAIR', mainRank: v, cards: [v+1, v+1, v+1, k+1, k+1] });
        }
      }
    }
  }

  // Straights (5+ consecutive, values 0-12 only = A through K)
  for (let start = 0; start <= 9; start++) { // start at A, max start such that 5 cards fit within K
    for (let end = start + 4; end <= 12; end++) {
      let valid = true;
      for (let v = start; v <= end; v++) {
        if (hand[v] < 1) { valid = false; break; }
      }
      if (valid) {
        const cards = [];
        for (let v = start; v <= end; v++) cards.push(v + 1);
        moves.push({ type: 'STRAIGHT', mainRank: start, length: end - start + 1, cards });
      }
    }
  }

  // Consecutive Pairs (3+ consecutive pairs, values 0-12)
  for (let start = 0; start <= 10; start++) {
    for (let end = start + 2; end <= 12; end++) {
      let valid = true;
      for (let v = start; v <= end; v++) {
        if (hand[v] < 2) { valid = false; break; }
      }
      if (valid) {
        const cards = [];
        for (let v = start; v <= end; v++) cards.push(v + 1, v + 1);
        moves.push({ type: 'CONSECUTIVE_PAIRS', mainRank: start, length: end - start + 1, cards });
      }
    }
  }

  // Airplanes (2+ consecutive triples, values 0-12)
  // With singles, with pairs, and without wings
  for (let start = 0; start <= 11; start++) {
    for (let end = start + 1; end <= 12; end++) {
      let valid = true;
      for (let v = start; v <= end; v++) {
        if (hand[v] < 3) { valid = false; break; }
      }
      if (!valid) break; // can't extend further

      const trioCount = end - start + 1;
      const trioRanks = new Set<number>();
      for (let v = start; v <= end; v++) trioRanks.add(v);
      const trioCards: number[] = [];
      for (let v = start; v <= end; v++) trioCards.push(v+1, v+1, v+1);

      // Airplane without wings
      moves.push({ type: 'AIRPLANE', mainRank: start, length: trioCount, cards: trioCards });

      // Airplane with singles: need `trioCount` singles from non-trio ranks
      const singleKickers = [];
      for (let k = 0; k < 15; k++) {
        if (!trioRanks.has(k) && hand[k] >= 1) singleKickers.push(k);
      }
      if (singleKickers.length >= trioCount) {
        for (const combo of combinations(singleKickers, trioCount)) {
          const cards = [...trioCards, ...combo.map(k => k + 1)];
          moves.push({ type: 'AIRPLANE_SINGLES', mainRank: start, length: trioCount, cards });
        }
      }

      // Airplane with pairs: need `trioCount` pairs from non-trio ranks
      const pairKickers = [];
      for (let k = 0; k < 15; k++) {
        if (!trioRanks.has(k) && hand[k] >= 2) pairKickers.push(k);
      }
      if (pairKickers.length >= trioCount) {
        for (const combo of combinations(pairKickers, trioCount)) {
          const cards = [...trioCards, ...combo.flatMap(k => [k + 1, k + 1])];
          moves.push({ type: 'AIRPLANE_PAIRS', mainRank: start, length: trioCount, cards });
        }
      }
    }
  }

  // Four + Two Singles / Two Pairs
  for (let v = 0; v < 15; v++) {
    if (hand[v] === 4) {
      // Bombs (separate from four+two)
      moves.push({ type: 'BOMB', mainRank: v, cards: [v+1, v+1, v+1, v+1] });

      // Four + two singles
      const singles = [];
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 1) singles.push(k);
      }
      if (singles.length >= 2) {
        for (const [a, b] of combinations(singles, 2)) {
          moves.push({ type: 'FOUR_TWO_SINGLES', mainRank: v,
            cards: [v+1, v+1, v+1, v+1, a+1, b+1] });
        }
      }

      // Four + two pairs
      const pairs = [];
      for (let k = 0; k < 15; k++) {
        if (k !== v && hand[k] >= 2) pairs.push(k);
      }
      if (pairs.length >= 2) {
        for (const [a, b] of combinations(pairs, 2)) {
          moves.push({ type: 'FOUR_TWO_PAIRS', mainRank: v,
            cards: [v+1, v+1, v+1, v+1, a+1, a+1, b+1, b+1] });
        }
      }
    }
  }

  // Rocket
  if (hand[13] >= 1 && hand[14] >= 1) {
    moves.push({ type: 'ROCKET', mainRank: 14, cards: [14, 15] });
  }

  return moves;
}
```

### Move Generation for Following Mode

```typescript
function generateFollowingMoves(hand: Hand, lastMove: Move): Move[] {
  const moves: Move[] = [];

  // PASS is always available when following
  moves.push(PASS_MOVE);

  switch (lastMove.type) {
    case 'SINGLE':
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 1) moves.push({ type: 'SINGLE', mainRank: v, cards: [v + 1] });
      }
      break;

    case 'PAIR':
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 2) moves.push({ type: 'PAIR', mainRank: v, cards: [v + 1, v + 1] });
      }
      break;

    case 'TRIPLE':
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) moves.push({ type: 'TRIPLE', mainRank: v, cards: [v+1, v+1, v+1] });
      }
      break;

    case 'TRIPLE_SINGLE':
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) {
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 1) {
              moves.push({ type: 'TRIPLE_SINGLE', mainRank: v, cards: [v+1, v+1, v+1, k+1] });
            }
          }
        }
      }
      break;

    case 'TRIPLE_PAIR':
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] >= 3) {
          for (let k = 0; k < 15; k++) {
            if (k !== v && hand[k] >= 2) {
              moves.push({ type: 'TRIPLE_PAIR', mainRank: v, cards: [v+1, v+1, v+1, k+1, k+1] });
            }
          }
        }
      }
      break;

    case 'STRAIGHT':
      // Must match length exactly
      generateStraightsOfLength(hand, lastMove.length, lastMove.mainRank, moves);
      break;

    case 'CONSECUTIVE_PAIRS':
      generateConsecutivePairsOfLength(hand, lastMove.length, lastMove.mainRank, moves);
      break;

    case 'AIRPLANE':
    case 'AIRPLANE_SINGLES':
    case 'AIRPLANE_PAIRS':
      generateAirplaneFollows(hand, lastMove, moves);
      break;

    case 'FOUR_TWO_SINGLES':
      generateFourTwoSinglesFollows(hand, lastMove.mainRank, moves);
      break;

    case 'FOUR_TWO_PAIRS':
      generateFourTwoPairsFollows(hand, lastMove.mainRank, moves);
      break;

    case 'BOMB':
      // Must play a higher bomb
      for (let v = lastMove.mainRank + 1; v < 15; v++) {
        if (hand[v] === 4) moves.push({ type: 'BOMB', mainRank: v, cards: [v+1,v+1,v+1,v+1] });
      }
      // Rocket always beats bomb
      if (hand[13] >= 1 && hand[14] >= 1) {
        moves.push({ type: 'ROCKET', mainRank: 14, cards: [14, 15] });
      }
      return moves; // Don't add generic bomb overrides below

    case 'ROCKET':
      // Nothing beats a rocket, only PASS
      return moves;
  }

  // For non-bomb last moves, bombs and rockets can always be played as overrides
  if (lastMove.type !== 'BOMB' && lastMove.type !== 'ROCKET') {
    for (let v = 0; v < 15; v++) {
      if (hand[v] === 4) moves.push({ type: 'BOMB', mainRank: v, cards: [v+1,v+1,v+1,v+1] });
    }
    if (hand[13] >= 1 && hand[14] >= 1) {
      moves.push({ type: 'ROCKET', mainRank: 14, cards: [14, 15] });
    }
  }

  return moves;
}
```

### Zobrist Hashing for Transposition Table

```typescript
// Pre-compute random 64-bit values for Zobrist hashing
// Each (position, card_value, count) triple gets a random value
// Hash = XOR of all triples in the current state

// For a two-player endgame, the state is:
// (myHand[0..14], opponentHand[0..14], lastMoveType, lastMoveMainRank, passCount)

// Simplified approach: hash the full state as a string
// (sufficient for endgame with <10 cards per hand)
function computeStateHash(
  myHand: Hand,
  opponentHand: Hand,
  lastMove: Move | null,
  passCount: number,
): string {
  // Compact representation for Map key
  return `${myHand.join(',')}:${opponentHand.join(',')}:${lastMove?.type ?? 'null'}:${lastMove?.mainRank ?? 0}:${passCount}`;
}

// For better performance, use Zobrist:
// Pre-compute: zobristTable[player][cardValue][count] = random64bit
// Hash = XOR(zobristTable[0][v][myHand[v]] for v in 0..14)
//       ^ XOR(zobristTable[1][v][opponentHand[v]] for v in 0..14)
//       ^ zobristLastMove[lastMoveType][lastMoveMainRank]
//       ^ zobristPassCount[passCount]
```

### Combinations Utility

```typescript
// Generate all k-element combinations from an array
// Port of Python's itertools.combinations
function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) { yield []; return; }
  if (k > arr.length) return;
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = arr.slice(i + 1);
    for (const combo of combinations(rest, k - 1)) {
      yield [arr[i], ...combo];
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Brute-force enumeration of all card subsets | Type-aware move generation by hand type | Standard since ~2018 | Reduces move space from 2^n (all subsets) to O(n * types) |
| String-keyed memoization | Zobrist hashing + numeric transposition table | Chess/Shogi standard, applied to DDZ ~2020 | O(1) lookup vs O(n) string comparison |
| Basic minimax | Negamax with alpha-beta pruning | Standard algorithm | Cuts search tree by ~50% on average |
| No time budget | Iterative deepening with time budget | Standard since ~2019 | Allows graceful degradation under time pressure |
| Single-threaded search | Multi-process parallel search (multiprocessing in Python) | julywind/doudizhu_endgame ~2022 | Near-linear speedup with core count |

**Deprecated/outdated:**
- Enumerating all 2^n subsets of a hand to find valid plays (as in the WZ403809264 C++ solver): This generates invalid combinations and filters them, which is extremely slow for hands with many cards. Type-aware generation is always faster.
- Global flag-based configuration for enabling/disabling hand types (as in the iWoz Python solver): Use a configuration object or bitmask instead.

## Open Questions

1. **Kicker duplication in Airplane+Singles**
   - What we know: In most DDZ rule sets, the singles used as airplane kickers can be the same rank as each other (e.g., two 5s as two separate single kickers). Some competitive rules require all kickers to be distinct.
   - What's unclear: Which rule does this project use?
   - Recommendation: Allow duplicate single kickers (the more common rule). The `combinations` function on available cards naturally handles this since it picks individual card slots, not ranks.

2. **Four+Two Kickers: Can kickers include jokers?**
   - What we know: Most implementations allow jokers as single kickers in four+two-singles. The pair of jokers (rocket) is usually NOT allowed as a pair kicker in four+two-pairs.
   - What's unclear: Project-specific rule.
   - Recommendation: Allow jokers as single kickers. Disallow rocket (pair of jokers) as a pair kicker in four+two-pairs.

3. **Decision Tree: Prune losing branches?**
   - What we know: D-06 says "full tree -- include every possible opponent response for each winning move." This implies the tree should contain ALL opponent responses to each winning player move.
   - What's unclear: Should losing branches be explored to full depth, or can they be pruned once proven losing?
   - Recommendation: Explore all opponent responses, but do NOT recurse further into branches proven losing for the player. Mark them as terminal loss nodes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime + Vitest | Yes | 24.14.0 | -- |
| npm | Package management | Yes | 11.9.0 | -- |
| Vitest | Testing | Not installed | -- | `npm install -D vitest` (Wave 0) |

**Missing dependencies with no fallback:**
- None. Node.js and npm are available. Vitest will be installed during project setup.

**Missing dependencies with fallback:**
- Vitest not yet installed -- will be installed as part of project scaffolding (Wave 0).

## Sources

### Primary (HIGH confidence)
- GitHub: iWoz/doudizhu_solver -- Complete Python solver reference (62 stars). Verified move generation, minimax search, transposition caching patterns.
- GitHub: julywind168/doudizhu_endgame -- Python solver with multiprocessing, transposition table using ctypes, all 14+ hand types including airplane wings with `itertools.combinations`.
- GitHub: Firestar666-ui/DouDiZhu-Solver-GUI -- Java solver with 3-bit per card encoding, memoization via HashMap, tree construction.
- GitHub: lollipop248454/doudizhu-solver -- C++ solver with type-based move enumeration and `paixing()` classification.
- STATE.md blocker note: Confirmed airplane+wings kicker generation is the key complexity point.

### Secondary (MEDIUM confidence)
- Training data knowledge of DDZ rules (hand types, sequence constraints, bomb hierarchy) -- cross-verified against multiple reference implementations.
- Training data knowledge of Zobrist hashing and transposition tables -- standard game AI technique, well-documented.

### Tertiary (LOW confidence)
- Specific DDZ tournament rules for edge cases (kicker duplication in airplane+singles, rocket as pair kicker). Multiple sources give conflicting rules. Recommend testing with the most common rule set.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No external runtime dependencies. Pure TypeScript algorithm. Vitest for testing is standard.
- Architecture: HIGH -- Three reference implementations confirm the same architectural pattern: count encoding, type-aware move generation, negamax search, memoization.
- Pitfalls: HIGH -- Pitfalls identified from direct code analysis of reference implementations, especially the airplane wings kicker generation (STATE.md blocker) and pass transfer logic.
- DDZ rules: MEDIUM -- Edge cases in kicker rules have variations across sources. Core rules are well-established.

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain -- game rules do not change)
