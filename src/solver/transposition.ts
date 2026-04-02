import type { Hand, Move } from './types.js';

/**
 * Transposition table for deduplicating identical game states during search.
 * Uses string-based hashing (sufficient for endgame with <10 cards per hand).
 */
export class TranspositionTable {
  private table: Map<string, number> = new Map();
  private _hits: number = 0;

  /**
   * Generate a unique string key for a game state.
   * Combines both hands, last move info, and pass count.
   */
  computeStateHash(
    myHand: Hand,
    opponentHand: Hand,
    lastMove: Move | null,
    passCount: number,
  ): string {
    const lastMoveStr = lastMove
      ? `${lastMove.type}:${lastMove.mainRank}`
      : 'null';
    return `${myHand.join(',')}:${opponentHand.join(',')}:${lastMoveStr}:${passCount}`;
  }

  /**
   * Look up a cached result. Returns undefined if not found.
   * Increments hit counter on cache hit.
   */
  get(key: string): number | undefined {
    const value = this.table.get(key);
    if (value !== undefined) {
      this._hits++;
    }
    return value;
  }

  /**
   * Store a result in the transposition table.
   */
  set(key: string, value: number): void {
    this.table.set(key, value);
  }

  /**
   * Number of cache hits (times get() returned a non-undefined value).
   */
  get hits(): number {
    return this._hits;
  }

  /**
   * Clear the transposition table and reset hit counter.
   */
  clear(): void {
    this.table.clear();
    this._hits = 0;
  }
}
