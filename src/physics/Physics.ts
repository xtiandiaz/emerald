import { Vector } from '../core'

export namespace Physics {
  export const NEARLY_ZERO_MAGNITUDE = 0.001 // 1 mm

  export interface Gravity {
    vector: Vector
    value: number
  }

  export interface Friction {
    static: number
    dynamic: number
  }
}
