/**
 * Sample TypeScript file for complexity testing
 * Expected cyclomatic complexity: 5
 */

export function complexFunction(x: number, y: number): number {
  // Complexity: 5
  // 1. Base
  // 2. if (x > 0)
  // 3. && y > 0
  // 4. else if (x < 0)
  // 5. || y < 0

  if (x > 0 && y > 0) {
    return x + y;
  } else if (x < 0 || y < 0) {
    return x - y;
  } else {
    return 0;
  }
}

export function simpleFunction(a: number): number {
  // Complexity: 1 (no branches)
  return a * 2;
}
