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

  export interface AreaProperties {
    // As per Area Density: https://en.wikipedia.org/wiki/Area_density
    mass: number
    // As per Second Moment of Inertia: https://en.wikipedia.org/wiki/Second_moment_of_area
    momentOfInertia: number
  }
}
