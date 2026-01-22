export namespace EMath {
  export function average(...values: number[]): number {
    return values.reduce((sum, n) => sum + n, 0) / values.length
  }

  export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  export function clamp01(value: number) {
    return clamp(value, 0, 1)
  }

  export function isNearlyEqual(a: number, b: number, minDifference: number = 0.001): boolean {
    return Math.abs(b - a) <= minDifference
  }

  export function lerp(from: number, to: number, at: number): number {
    return from + (to - from) * at
  }

  export function sign(value: number): number {
    return value < 0 ? -1 : 1
  }
}
