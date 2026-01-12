import { Point } from 'pixi.js'
import type { Vector } from './types'

export namespace Geometry {
  export class Segment {
    get vector(): Vector {
      return this.b.subtract(this.a)
    }

    get magnitudeSqrd(): number {
      return this.vector.magnitudeSquared()
    }

    constructor(
      public a = new Point(),
      public b = new Point(),
    ) {}

    getPointAtNormalizedDistance(normDist: number, out_point?: Point): Point {
      if (normDist <= 0) {
        return this.a
      } else if (normDist >= 1) {
        return this.b
      } else {
        out_point ??= new Point()
        return this.a.add(this.vector.multiplyScalar(normDist, out_point), out_point)
      }
    }

    getClosestPoint(to: Point, out_closestPoint?: Point): Point {
      const targetVector = to.subtract(this.a)
      out_closestPoint ??= new Point()

      return this.getPointAtNormalizedDistance(
        targetVector.dot(this.vector) / this.magnitudeSqrd,
        out_closestPoint,
      )
    }

    projectAndClipByMargin(axis: Vector, margin: number) {
      const aProjByMargin = axis.dot(this.a) - margin
      const bProjByMargin = axis.dot(this.b) - margin

      if (aProjByMargin * bProjByMargin < 0) {
        const newPoint = new Point()
        this.getPointAtNormalizedDistance(aProjByMargin / (aProjByMargin - bProjByMargin), newPoint)
        if (aProjByMargin < 0) {
          this.a = newPoint
        } else {
          this.b = newPoint
        }
      }
    }
  }

  /* 
    Following 'integraph' of a polygon technique: https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
  */
  export function calculateCentroid(vertices: number[]) {
    const c = new Point()
    let x0: number, y0: number, x1: number, y1: number
    let doubleTotalArea = 0
    let crossProdSignedParalleloArea: number
    for (let i = 0; i < vertices.length; i += 2) {
      x0 = vertices[i]!
      y0 = vertices[i + 1]!
      x1 = vertices[(i + 2) % vertices.length]!
      y1 = vertices[(i + 3) % vertices.length]!
      crossProdSignedParalleloArea = x0 * y1 - x1 * y0
      c.x += (x0 + x1) * crossProdSignedParalleloArea
      c.y += (y0 + y1) * crossProdSignedParalleloArea
      doubleTotalArea += crossProdSignedParalleloArea
    }
    c.x /= 6 * 0.5 * doubleTotalArea
    c.y /= 6 * 0.5 * doubleTotalArea

    return c
  }
}
