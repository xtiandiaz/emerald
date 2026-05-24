import { Vector } from '../types'

export type Gravity = Vector

export interface ShapeProperties {
  mass: number
  // "Second polar moment of area", coloquially known as "moment of inertia" and
  // suitable for this purpose:
  // https://en.wikipedia.org/wiki/Second_polar_moment_of_area
  // In combination with the Perpendicular Axis Theorem:
  // https://en.wikipedia.org/wiki/Perpendicular_axis_theorem
  momentOfInertia: number // -> Iz = Ix + Iy
}
