import { Point, PointData } from 'pixi.js'
import { getClosestPoint, ProjectionRange, Segment, Shape } from '..'
import { EMath } from '../../extras'
import { VectorData } from '../../types'

export class ConvexPolygon extends Shape {
  readonly _vertices: Point[]
  readonly _localVertices: PointData[]
  readonly localCenter: Point // -> Centroid

  private readonly props = {
    sides: [new Segment(), new Segment()],
  }

  constructor(vertices: PointData[]) {
    super()

    this._localVertices = vertices.map((v) => ({ x: v.x, y: v.y }))
    this._vertices = vertices.map((v) => new Point(v.x, v.y))
    this.localCenter = ConvexPolygon.calculateCentroid(vertices)
  }

  static from(radius: number, sides: number): ConvexPolygon {
    sides = EMath.clamp(Math.round(sides), 3, 16)
    radius = EMath.clamp(radius, 1, Infinity)
    const vertices: PointData[] = []
    const angleStep = (2 * Math.PI) / sides

    for (let i = 0; i < sides; i++) {
      vertices.push({ x: radius * Math.cos(i * angleStep), y: radius * Math.sin(i * angleStep) })
    }

    return new this(vertices)
  }

  getProjectionRange(axis: VectorData): ProjectionRange {
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

  _getSideAcross(axis: VectorData): Segment {
    const vi = this.getVertexIndexWithMaxProjection(axis)
    const v = this._vertices[vi]!
    const prev_v = this._vertices[(vi == 0 ? this._vertices.length : vi) - 1]!
    const next_v = this._vertices[(vi + 1) % this._vertices.length]!
    return Segment.getMostPerpendicular(
      this.props.sides[0].reset(prev_v, v),
      this.props.sides[1].reset(v, next_v),
      axis,
    )
  }

  protected updateVertices(): void {
    super.updateVertices()

    let v: Point

    this._bb.min.x = Infinity
    this._bb.max.x = -Infinity
    this._bb.min.y = Infinity
    this._bb.max.y = -Infinity

    for (let i = 0; i < this._localVertices.length; i++) {
      v = this._vertices[i]!
      this._transform.matrix.apply(this._localVertices[i]!, v)

      this._bb.min.x = Math.min(this._bb.min.x, v.x)
      this._bb.max.x = Math.max(this._bb.max.x, v.x)
      this._bb.min.y = Math.min(this._bb.min.y, v.y)
      this._bb.max.y = Math.max(this._bb.max.y, v.y)
    }
  }

  private getVertexIndexWithMaxProjection(axis: VectorData): number {
    let maxProjection = -Infinity
    let index = -1

    for (let i = 0; i < this._vertices.length; i++) {
      const proj = this._vertices[i]!.dot(axis)
      if (proj > maxProjection) {
        maxProjection = proj
        index = i
      }
    }
    return index
  }
}

export namespace ConvexPolygon {
  /* 
    Calculation of centroid following 'integraph of a polygon' technique: 
    https://en.wikipedia.org/wiki/Centroid#Of_a_polygon
    
    For the area, using 'shoelace' formula, particularly the 'triangle' one: 
    https://en.wikipedia.org/wiki/Shoelace_formula
  */
  export function calculateCentroid(vertices: PointData[]): Point {
    const centroid = new Point()
    let v0: PointData, v1: PointData
    let paralleloArea: number,
      area = 0

    for (let i = 0; i < vertices.length; i++) {
      v0 = vertices[i]!
      v1 = vertices[(i + 1) % vertices.length]!
      paralleloArea = EMath.cross(v0, v1)
      centroid.x += (v0.x + v1.x) * paralleloArea
      centroid.y += (v0.y + v1.y) * paralleloArea
      area += paralleloArea * 0.5 // -> triangle area
    }
    centroid.divideByScalar(6 * area, centroid)

    return centroid
  }
}
