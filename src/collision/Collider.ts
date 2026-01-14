import { Point, Transform, type PointData } from 'pixi.js'
import { Vector, type Range, type VectorData } from '../core'
import { Geometry } from '../geometry'
import { Collision } from '../collision'
import { ExtraMath } from '../extras'

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
      public readonly aabb: Geometry.AABB = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
    ) {
      this.vertices = _vertices.map((v) => v.clone())

      this.updateVertices()
    }

    static circle(x: number, y: number, r: number) {
      return new Circle(x, y, r)
    }
    static polygon(vertices: number[]) {
      return new ConvexPolygon(vertices)
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

      return Geometry.isAABBIntersection(this.aabb, B.aabb)
    }

    findContact(B: Shape, includePoints: boolean = false): Collision.Contact | undefined {
      this.updateVerticesIfNeeded()
      B.updateVerticesIfNeeded()

      if (!this.hasAABBIntersection(B)) {
        return
      }

      let contact: Collision.Contact | undefined
      if (B instanceof Circle) {
        contact = this.findContactWithCircle(B, includePoints)
      } else if (B instanceof ConvexPolygon) {
        contact = this.findContactWithPolygon(B, includePoints)
      }

      return contact
    }

    abstract getProjectionRange(axis: Vector): Range

    abstract findContactWithCircle(B: Circle, includePoints: boolean): Collision.Contact | undefined
    abstract findContactWithPolygon(
      B: ConvexPolygon,
      includePoints: boolean,
    ): Collision.Contact | undefined

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

      this.area = Geometry.Circle.area(radius)
    }

    getProjectionRange(axis: Vector): Range {
      return Geometry.Circle.getProjectionRange(this.center, this.radius, axis)
    }

    findContactWithCircle(B: Circle, includePoints: boolean): Collision.Contact | undefined {
      const radii = this.radius + B.radius
      const diffPos = B.center.subtract(this.center)
      const distSqrd = diffPos.magnitudeSquared()
      if (distSqrd >= radii * radii) {
        return
      }
      const dist = Math.sqrt(distSqrd)
      const normal = diffPos.divideByScalar(dist)
      const depth = radii - dist

      const contact: Collision.Contact = { depth, normal }
      if (includePoints) {
        contact.points = [
          {
            point: this.center.add(normal.multiplyScalar(this.radius)),
            depth,
          },
        ]
      }
      return contact
    }

    findContactWithPolygon(
      B: ConvexPolygon,
      includePoints: boolean,
    ): Collision.Contact | undefined {
      const contact: Collision.Contact = { depth: Infinity, normal: new Vector() }
      if (!this.evaluateContactWithPolygon(B, contact) || !B.evaluateContact(this, contact)) {
        return
      }

      Collision.correctDirectionIfNeeded(this, B, contact)

      if (includePoints) {
        this.setContactPointsWithPolygon(B, contact)
      }
      return contact
    }

    protected updateVertices(): void {
      this.aabb.min.x = this.position.x - this.radius
      this.aabb.min.y = this.position.y - this.radius
      this.aabb.max.x = this.position.x + this.radius
      this.aabb.max.y = this.position.y + this.radius
    }

    protected evaluateContactWithPolygon(
      polygon: ConvexPolygon,
      out_contact: Collision.Contact,
    ): boolean {
      const closestVerIdx = Geometry.ConvexPolygon.getClosestVertexIndexToPoint(
        this.center,
        polygon.vertices,
      )
      const closestVer = polygon.vertices[closestVerIdx]!
      const axis = new Vector()
      closestVer.subtract(this.center, axis).normalize(axis)

      return Geometry.evaluateProjectionOverlap(
        this.getProjectionRange(axis),
        polygon.getProjectionRange(axis),
        axis,
        out_contact,
      )
    }

    private setContactPointsWithPolygon(B: ConvexPolygon, out_contact: Collision.Contact) {
      const edge = Geometry.ConvexPolygon.getEdgeAcrossNormal(
        B.vertices,
        out_contact.normal.multiplyScalar(-1),
      )
      out_contact.points = [
        {
          point: edge.getClosestPoint(this.center),
          depth: out_contact.depth,
        },
      ]
    }
  }

  export class ConvexPolygon extends Shape {
    readonly area: number

    constructor(vertices: number[]) {
      const _vertices: Point[] = []
      for (let i = 0; i < vertices.length; i += 2) {
        _vertices.push(new Point(vertices[i]!, vertices[i + 1]!))
      }
      super(_vertices, Geometry.ConvexPolygon.calculateCentroid(vertices))

      this.area = (this.aabb.max.x - this.aabb.min.x) * (this.aabb.max.y - this.aabb.min.y)
    }

    getAxis(index: number, ref_axis: Vector) {
      this.vertices[(index + 1) % this.vertices.length]!.subtract(this.vertices[index]!, ref_axis)
        .orthogonalize(ref_axis)
        .normalize(ref_axis)
    }

    getProjectionRange(axis: VectorData): Range {
      return Geometry.ConvexPolygon.getProjectionRange(this.vertices, axis)
    }

    findContactWithCircle(B: Circle, includePoints: boolean): Collision.Contact | undefined {
      const contact = B.findContactWithPolygon(this, includePoints)
      contact?.normal.multiplyScalar(-1, contact.normal)

      return contact
    }

    findContactWithPolygon(
      B: ConvexPolygon,
      includePoints: boolean,
    ): Collision.Contact | undefined {
      const contact: Collision.Contact = { depth: Infinity, normal: new Vector() }
      if (!this.evaluateContact(B, contact) || !B.evaluateContact(this, contact)) {
        return
      }

      Collision.correctDirectionIfNeeded(this, B, contact)

      if (includePoints) {
        this.setContactPointsWithPolygon(B, contact)
      }
      return contact
    }

    evaluateContact(B: Shape, out_contact: Collision.Contact): boolean {
      const axis = new Vector()

      for (let i = 0; i < this.vertices.length; i++) {
        this.getAxis(i, axis)

        if (
          !Geometry.evaluateProjectionOverlap(
            this.getProjectionRange(axis),
            B.getProjectionRange(axis),
            axis,
            out_contact,
          )
        ) {
          return false
        }
      }
      return true
    }

    private setContactPointsWithPolygon(B: ConvexPolygon, out_contact: Collision.Contact) {
      const edgeA = Geometry.ConvexPolygon.getEdgeAcrossNormal(this.vertices, out_contact.normal)
      const edgeB = Geometry.ConvexPolygon.getEdgeAcrossNormal(
        B.vertices,
        out_contact.normal.multiplyScalar(-1),
      )
      const contactN = out_contact.normal
      // Reference and incident edges; ref. is the most perpendicular to the contact's Normal,
      // and thus used to clip the incident's edge vertices to get the contact points
      // Source: https://dyn4j.org/2011/11/contact-points-using-clipping/
      let refEdge: Geometry.Segment, incEdge: Geometry.Segment
      if (Math.abs(edgeA.vector.dot(contactN)) < Math.abs(edgeB.vector.dot(contactN))) {
        refEdge = edgeA
        incEdge = edgeB
      } else {
        refEdge = edgeB
        incEdge = edgeA
      }
      // Normalize refEdge to use as axis
      const axis = refEdge.vector.normalize()
      incEdge.projectAndClipByMargin(axis, axis.dot(refEdge.a))

      axis.multiplyScalar(-1, axis)
      incEdge.projectAndClipByMargin(axis, axis.dot(refEdge.b))

      const cps: Collision.ContactPoint[] = []
      const refN = axis.crossScalar(-1)
      const aRefProj = refN.dot(refEdge.a)
      let depth = aRefProj - refN.dot(incEdge.a)
      if (depth >= 0) {
        cps.push({ point: incEdge.a, depth: depth })
      }
      depth = aRefProj - refN.dot(incEdge.b)
      if (depth >= 0) {
        cps.push({ point: incEdge.b, depth: depth })
      }

      out_contact.points = cps
      out_contact.depth = ExtraMath.average(...cps.map((cp) => cp.depth))
    }
  }
}
