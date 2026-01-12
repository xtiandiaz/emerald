import { Point, Transform, type PointData } from 'pixi.js'
import { Vector, type Range, type VectorData } from '.'
import { Geometry, Collision } from '.'

export interface Collider {
  readonly shape: Collider.Shape
  readonly collidedIds: Set<number>
  layer: number
}

export namespace Collider {
  export abstract class Shape {
    abstract readonly area: number
    readonly vertices: Point[]
    protected transform = new Transform()
    private shouldUpdateVertices = true

    get center(): Point {
      return this.transform.position.add(this.centroid)
    }
    get position(): PointData {
      return this.transform.position
    }

    protected constructor(
      protected readonly _vertices: Point[],
      protected readonly centroid: Point,
      public readonly aabb: Collision.AABB = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
    ) {
      this.vertices = _vertices.map((v) => v.clone())

      this.updateVertices()
    }

    static circle(x: number, y: number, r: number) {
      return new Circle(x, y, r)
    }
    static polygon(vertices: number[]) {
      return new Polygon(vertices)
    }
    static rectangle(x: number, y: number, w: number, h: number) {
      return Collider.Shape.polygon([x, y, x + w, y, x + w, y + h, x, y + h])
    }

    setTransform(position: PointData, rotation: number) {
      this.shouldUpdateVertices =
        this.transform.position.x != position.x ||
        this.transform.position.y != position.y ||
        this.transform.rotation != rotation

      this.transform.position.set(position.x, position.y)
      this.transform.rotation = rotation
    }

    updateVerticesIfNeeded() {
      if (this.shouldUpdateVertices) {
        this.updateVertices()
      }
      this.shouldUpdateVertices = false
    }

    hasAABBIntersection(B: Shape): boolean {
      this.updateVerticesIfNeeded()
      B.updateVerticesIfNeeded()

      return Collision.isAABBIntersection(this.aabb, B.aabb)
    }

    findContact(B: Shape, includePoints: boolean = false): Collision.Contact | undefined {
      const A = this
      A.updateVerticesIfNeeded()
      B.updateVerticesIfNeeded()

      let contact: Collision.Contact | undefined
      if (B instanceof Circle) {
        contact = A.findContactWithCircle(B)
      } else if (B instanceof Polygon) {
        contact = A.findContactWithPolygon(B)
      }
      if (contact) {
        Collision.correctContactDirectionIfNeeded(A, B, contact)

        if (includePoints) {
          A.includeContactPoints(B, contact)
        }
      }
      return contact
    }

    abstract getProjectionRange(axis: Vector): Range

    abstract findContactWithCircle(B: Circle): Collision.Contact | undefined
    abstract findContactWithPolygon(B: Polygon): Collision.Contact | undefined

    abstract includeContactPoints(B: Shape, out_contact: Collision.Contact): void

    protected updateVertices() {
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity

      for (let i = 0; i < this._vertices.length; i++) {
        const v = this.vertices[i]!
        this.transform.matrix.apply(this._vertices[i]!, v)

        minX = Math.min(minX, v.x)
        maxX = Math.max(maxX, v.x)
        minY = Math.min(minY, v.y)
        maxY = Math.max(maxY, v.y)
      }
      this.aabb.min.x = minX
      this.aabb.min.y = minY
      this.aabb.max.x = maxX
      this.aabb.max.y = maxY
    }
  }

  export class Circle extends Shape {
    readonly area: number

    constructor(
      x: number,
      y: number,
      public readonly radius: number,
    ) {
      super([], new Point(x, y), {
        min: { x: x - radius, y: y - radius },
        max: { x: x + radius, y: y + radius },
      })

      this.area = Math.PI * radius * radius
    }

    getProjectionRange(axis: Vector): Range {
      return Collision.getCircleProjectionRange(this.center, this.radius, axis)
    }

    findContactWithCircle(B: Circle): Collision.Contact | undefined {
      const radii = this.radius + B.radius
      const diffPos = B.center.subtract(this.center)
      const distSqrd = diffPos.magnitudeSquared()
      if (distSqrd >= radii * radii) {
        return
      }
      const dist = Math.sqrt(distSqrd)

      return {
        depth: radii - dist,
        normal: diffPos.divideByScalar(dist),
      }
    }

    findContactWithPolygon(B: Polygon): Collision.Contact | undefined {
      const A = this
      const contact: Collision.Contact = { depth: Infinity, normal: new Vector() }
      if (
        !A.evaluatePolygonProjectionOverlap(B, contact) ||
        !B.evaluateProjectionOverlap(A, contact)
      ) {
        return
      }
      return contact
    }

    // TODO refactor using the new algorithm to find contact points
    includeContactPoints(B: Shape, out_contact: Collision.Contact): void {
      if (B instanceof Circle) {
        out_contact.points = [
          {
            point: this.center.add(out_contact.normal.multiplyScalar(this.radius)),
            depth: out_contact.depth,
          },
        ]
      } else {
        out_contact.points = [
          {
            point: Collision.findContactPointsOnPolygon(this.center, B.vertices).cp1,
            depth: out_contact.depth,
          },
        ]
      }
    }

    protected evaluatePolygonProjectionOverlap(
      polygon: Polygon,
      out_overlap: Collision.ProjectionOverlap,
    ): boolean {
      const closestVerIdx = Collision.getClosestVertexIndexToPoint(polygon.vertices, this.center)
      const closestVer = polygon.vertices[closestVerIdx]!
      const axis = new Vector()
      closestVer.subtract(this.center, axis).normalize(axis)

      return Collision.evaluateProjectionOverlap(
        Collision.getCircleProjectionRange(this.center, this.radius, axis),
        Collision.getProjectionRange(polygon.vertices, axis),
        axis,
        out_overlap,
      )
    }

    protected updateVertices(): void {
      this.aabb.min.x = this.position.x - this.radius
      this.aabb.min.y = this.position.y - this.radius
      this.aabb.max.x = this.position.x + this.radius
      this.aabb.max.y = this.position.y + this.radius
    }
  }

  export class Polygon extends Shape {
    readonly area: number

    constructor(vertices: number[]) {
      const _vertices: Point[] = []
      for (let i = 0; i < vertices.length; i += 2) {
        _vertices.push(new Point(vertices[i]!, vertices[i + 1]!))
      }
      super(_vertices, Geometry.calculateCentroid(vertices))

      this.area = (this.aabb.max.x - this.aabb.min.x) * (this.aabb.max.y - this.aabb.min.y)
    }

    getProjectionRange(axis: VectorData): Range {
      return Collision.getProjectionRange(this.vertices, axis)
    }

    findContactWithCircle(B: Circle): Collision.Contact | undefined {
      return B.findContactWithPolygon(this)
    }

    findContactWithPolygon(B: Polygon): Collision.Contact | undefined {
      const A = this
      const contact: Collision.Contact = { depth: Infinity, normal: new Vector() }
      if (!A.evaluateProjectionOverlap(B, contact) || !B.evaluateProjectionOverlap(A, contact)) {
        return
      }
      return contact
    }

    includeContactPoints(B: Shape, out_contact: Collision.Contact): void {
      if (B instanceof Circle) {
        B.includeContactPoints(this, out_contact)
      } else {
        out_contact.points = Collision.findContactPointsViaClipping(
          this.vertices,
          B.vertices,
          out_contact,
        )
      }
    }

    getAxis(index: number, ref_axis: Vector) {
      this.vertices[(index + 1) % this.vertices.length]!.subtract(this.vertices[index]!, ref_axis)
        .orthogonalize(ref_axis)
        .normalize(ref_axis)
    }

    evaluateProjectionOverlap(other: Shape, out_projOverlap: Collision.ProjectionOverlap): boolean {
      const axis = new Vector()

      for (let i = 0; i < this.vertices.length; i++) {
        this.getAxis(i, axis)
        if (
          !Collision.evaluateProjectionOverlap(
            this.getProjectionRange(axis),
            other.getProjectionRange(axis),
            axis,
            out_projOverlap,
          )
        ) {
          return false
        }
      }
      return true
    }
  }
}
