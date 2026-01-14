import { Vector } from '../core'
import { Collider } from '../collision'

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

  /* 
    Area Density: https://en.wikipedia.org/wiki/Area_density
  */
  export function calculateMass(area: number, density: number) {
    return area * density
  }
  /* 
    Src: https://www.rose-hulman.edu/ES204/PDFs/Appendix_from_Mechanical_Systems_Book.pdf
    TODO Find out why
  */
  export function calculateColliderShapeInertia(shape: Collider.Shape, mass: number) {
    if (shape instanceof Collider.Circle) {
      return (mass * Math.pow(shape.radius, 2)) / 2
    } else {
      const w = shape.aabb.max.x - shape.aabb.min.x
      const h = shape.aabb.max.y - shape.aabb.min.y
      const numberOfVertices = shape.vertices.length
      switch (numberOfVertices) {
        case 4:
          return (mass * (Math.pow(w, 2) + Math.pow(h, 2))) / 12
        default:
          throw new Error(
            `Inertia for polygons of ${numberOfVertices} vertices is NOT yet calculated!`,
          )
      }
    }
  }
}
