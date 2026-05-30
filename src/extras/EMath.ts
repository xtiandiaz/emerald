import { Vector, VectorData } from '../types'

export namespace EMath {
  export function isNearlyEqual(a: number, b: number, pettyDiff: number): boolean {
    return Math.abs(b - a) <= pettyDiff
  }

  export function sign(value: number): number {
    return value < 0 ? -1 : 1
  }

  export function average(...values: number[]): number {
    return values.reduce((sum, n) => sum + n, 0) / values.length
  }

  export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  export function clamp01(value: number) {
    return clamp(value, 0, 1)
  }

  export function lerp(from: number, to: number, at: number): number {
    return from + (to - from) * at
  }

  export function dot(a: VectorData, b: VectorData): number {
    return a.x * b.x + a.y * b.y
  }

  export function cross(a: VectorData, b: VectorData): number {
    return a.x * b.y - a.y * b.x
  }

  export function scalarCross(scalar: number, v: VectorData, out_vector?: Vector) {
    out_vector ??= new Vector()
    const x = v.x
    out_vector.x = -scalar * v.y
    out_vector.y = scalar * x
    return out_vector
  }
}
