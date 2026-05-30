import { Point, PointData } from 'pixi.js'
import {
  getClosestPointIndex,
  hasProjectionOverlap,
  overlapDepth,
  ProjectionOverlap,
  ProjectionRange,
  Shape,
  Segment,
} from '..'
import { EMath } from '../../extras'
import { VectorData } from '../../types'

export class ConvexPolygon extends Shape {
  readonly _vertices: Point[]
  readonly _localVertices: Point[]

  private readonly props = {
    point: new Point(),
    projRanges: [
      { min: 0, max: 0 },
      { min: 0, max: 0 },
    ] as [ProjectionRange, ProjectionRange],
    segments: [new Segment(), new Segment()],
  }

  constructor(
    vertices: PointData[], // in clock-wise order
  ) {
    super(ConvexPolygon.calculateCentroid(vertices))

    this._localVertices = vertices.map((v) => new Point(v.x, v.y))
    this._vertices = vertices.map((v) => new Point(v.x, v.y))
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

  getProjectionRange(axis: VectorData, out_projRange?: ProjectionRange): ProjectionRange {
    if (out_projRange) {
      out_projRange.min = Infinity
      out_projRange.max = -Infinity
    } else {
      out_projRange = { min: Infinity, max: -Infinity }
    }
    let proj: number
    for (let i = 0; i < this._vertices.length; i++) {
      proj = this._vertices[i]!.dot(axis)
      out_projRange.min = Math.min(out_projRange.min, proj)
      out_projRange.max = Math.max(out_projRange.max, proj)
    }
    return out_projRange
  }

  getClosestVertexIndex(from: PointData): number {
    return getClosestPointIndex(this._vertices, from)
  }

  getSideAcross(axis: VectorData, out_segment?: Segment): Segment {
    const vi = this.getVertexIndexWithMaxProjection(axis)
    const v = this._vertices[vi]!
    const prev_v = this._vertices[(vi == 0 ? this._vertices.length : vi) - 1]!
    const next_v = this._vertices[(vi + 1) % this._vertices.length]!
    // Maintain clock-wise order for the vertices used in the Segments:
    this.props.segments[0].reset(prev_v, v)
    this.props.segments[1].reset(v, next_v)

    out_segment ??= new Segment()
    const mp = Segment.getMostPerpendicular(this.props.segments[0], this.props.segments[1], axis)
    out_segment.copyFrom(mp)

    return out_segment
  }

  hasProjectionOverlap(
    other: Shape,
    out_overlap?: ProjectionOverlap,
  ): ProjectionOverlap | undefined {
    let depth: number,
      v0: Point,
      v1: Point,
      axis = this.props.point
    const pra = this.props.projRanges[0],
      prb = this.props.projRanges[1]

    out_overlap ??= { depth: Infinity, axis: new Point() }
    for (let i = 0; i < this._vertices.length; i++) {
      v0 = this._vertices[i]!
      v1 = this._vertices[(i + 1) % this._vertices.length]!
      v1.subtract(v0, axis).orthogonalize(axis).normalize(axis)
      this.getProjectionRange(axis, pra)
      other.getProjectionRange(axis, prb)
      if (!hasProjectionOverlap(pra, prb)) {
        return
      }
      depth = overlapDepth(pra, prb)
      if (depth < out_overlap.depth) {
        out_overlap.depth = depth
        out_overlap.axis.copyFrom(axis)
      }
    }
    return out_overlap
  }

  protected updateVertices(): void {
    super.updateVertices()

    this._bb.min.x = Infinity
    this._bb.max.x = -Infinity
    this._bb.min.y = Infinity
    this._bb.max.y = -Infinity

    let v: Point
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
