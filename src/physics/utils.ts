import { Point } from 'pixi.js'
import { Circle, ConvexPolygon, Shape } from '../geometry'
import { ShapeProperties } from './types'
import { EMath } from '../extras'

export function calculateShapeProperties(
  shape: Shape,
  density: number,
  ppm: number, // pixels per meter
): ShapeProperties {
  let mass: number, momentOfInertia: number

  // "Second moment of area"s ("moment of inertia"s) formulae borrowed from
  // https://en.wikipedia.org/wiki/List_of_second_moments_of_area
  if (shape instanceof Circle) {
    // Mass in terms of the shape's area and (its optional, uniform) density
    // https://en.wikipedia.org/wiki/Area_density; m = A * 𝑝
    const r = shape.radius / ppm
    mass = Math.PI * Math.pow(r, 2) * density
    momentOfInertia = (mass * Math.pow(r, 4)) / 2
  } else if (shape instanceof ConvexPolygon) {
    // For "Any Polygon" more explicitly described here
    // https://en.wikipedia.org/wiki/Second_moment_of_area
    const centroid = shape._localCenter
    const vertices = shape._localVertices
    const v0 = new Point(),
      v1 = new Point()
    const sq_ppm = ppm * ppm
    let v0_x_v1: number,
      area = 0

    momentOfInertia = 0
    for (let i = 0; i < vertices.length; i++) {
      // Relocate vertices to the origin using the centroid
      vertices[i]!.subtract(centroid, v0)
      vertices[(i + 1) % vertices.length]!.subtract(centroid, v1)
      v0_x_v1 = EMath.cross(v0, v1) / sq_ppm // -> parallelogram area
      area += v0_x_v1 / 2 // -> triangle area
      momentOfInertia += v0_x_v1 * (EMath.dot(v0, v0) + EMath.dot(v0, v1) + EMath.dot(v1, v1))
    }
    momentOfInertia *= density / 6
    mass = area * density
  } else {
    throw new Error(`Undefined shape ${shape}`)
  }

  return {
    mass,
    momentOfInertia,
  }
}
