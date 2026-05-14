import { Point, PointData } from 'pixi.js'
import { getClosestPoint, ProjectionRange, Shape, Vertex } from '..'

export class Polygon extends Shape {
  readonly _vertices: Point[] = []

  get center(): Point {
    throw new Error('Method not implemented.')
  }

  getProjectionRange(axis: PointData): ProjectionRange {
    const range: ProjectionRange = { min: Infinity, max: -Infinity }
    let proj: number

    for (let i = 0; i < this._vertices.length; i++) {
      proj = this._vertices[i]!.dot(axis)
      range.min = Math.min(range.min, proj)
      range.max = Math.max(range.max, proj)
    }
    return range
  }

  getClosestVertex(from: PointData): [index: number, point: PointData] {
    return getClosestPoint(this._vertices, from)!
  }

  protected updateVertices(): void {
    throw new Error('Method not implemented.')
  }
}
