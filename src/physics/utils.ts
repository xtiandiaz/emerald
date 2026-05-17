import { Point } from 'pixi.js'
import { Circle, ConvexPolygon, Shape } from '../geometry'
import { PhysicalShapeProperties } from './types'
import { EMath } from '../extras'

export function calculatePhysicalShapeProperties(
  shape: Shape,
  density = 1,
): PhysicalShapeProperties {
  let mass: number, momentOfInertia: number

  // "Second moment of area"s ("moment of inertia"s) formulae borrowed from
  // https://en.wikipedia.org/wiki/List_of_second_moments_of_area
  if (shape instanceof Circle) {
    momentOfInertia = (Math.PI * Math.pow(shape.radius, 4)) / 2
    // Mass in terms of the shape's area and (its optional, uniform) density
    // https://en.wikipedia.org/wiki/Area_density; m = A * 𝑝
    mass = Math.PI * Math.pow(shape.radius, 2) * density
  } else if (shape instanceof ConvexPolygon) {
    // For "Any Polygon" most explicitly described here
    // https://en.wikipedia.org/wiki/Second_moment_of_area
    const centroid = shape._localCenter
    const vertices = shape._localVertices
    const v0 = new Point(),
      v1 = new Point()
    let v0xv1: number,
      area = 0

    momentOfInertia = 0
    for (let i = 0; i < vertices.length; i++) {
      // Relocate vertices to the origin using the centroid
      v0.copyFrom(vertices[i]!).subtract(centroid, v0)
      v1.copyFrom(vertices[(i + 1) % vertices.length]!).subtract(centroid, v1)
      v0xv1 = EMath.cross(v0, v1) // -> paralellogram area
      area += v0xv1 / 2 // -> triangle area
      momentOfInertia = v0xv1 * (EMath.dot(v0, v0) + EMath.dot(v0, v1) + EMath.dot(v1, v1))
    }
    momentOfInertia /= 6
    mass = area * density
  } else {
    throw new Error(`Undefined shape ${shape}`)
  }

  return {
    mass,
    momentOfInertia,
  }
}
