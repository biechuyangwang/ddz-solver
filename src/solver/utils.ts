/**
 * Generate all k-element combinations from an array.
 * Port of Python's itertools.combinations.
 * Yields arrays in lexicographic order based on input array position.
 */
export function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  if (k === 0) {
    yield [];
    return;
  }
  if (k > arr.length) {
    return;
  }
  for (let i = 0; i <= arr.length - k; i++) {
    const rest = arr.slice(i + 1);
    for (const combo of combinations(rest, k - 1)) {
      yield [arr[i], ...combo];
    }
  }
}
