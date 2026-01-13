export namespace ExtraMath {
  export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  export function clamp01(value: number) {
    return clamp(value, 0, 1)
  }

  export function average(...values: number[]): number {
    return values.reduce((sum, n) => sum + n, 0) / values.length
  }
}
