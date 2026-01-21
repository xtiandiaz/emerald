import { Point, Transform, type PointData } from 'pixi.js'
import { Vector, type Range, type VectorData } from '../core'
import { Geometry } from '../geometry'
import { Collision } from '../collision'
import { EMath } from '../extras'

export abstract class Collider {
  layer = 1

  abstract readonly _areaProperties: Geometry.AreaProperties
  readonly _vertices: Point[]
  readonly _transform: Transform
  private shouldUpdateVertices = true

  get center(): Point {
    return this._transform.position.add(this.centroid)
  }
  get position(): PointData {
    return this._transform.position
  }
  protected get centroid(): Point {
    return this._areaProperties.centroid
  }

  protected constructor(
    protected readonly __vertices: Point[],
    public readonly aabb: Geometry.AABB = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
  ) {
    this._vertices = __vertices.map((v) => v.clone())
    this._transform = new Transform({
      observer: {
        _onUpdate: (_) => {
          this.shouldUpdateVertices = true
        },
      },
    })
  }

  static circle(radius: number, x: number = 0, y: number = 0) {
    return new Collider.Circle(radius, x, y)
  }

  static rectangle(width: number, height: number, x?: number, y?: number) {
    x ??= -width / 2
    y ??= -height / 2

    return new Collider.Polygon([
      new Point(x, y),
      new Point(x + width, y),
      new Point(x + width, y + height),
      new Point(x, y + height),
    ])
  }

  static regularPolygon(radius: number, sides: number) {
    return new Collider.Polygon(Geometry.Polygon.createRegularPolygonVertices(radius, sides))
  }

  static polygon(vertices: Point[]) {
    return new Collider.Polygon(vertices)
  }

  updateTransform(position: PointData, rotation: number, scale: number) {
    this._transform.position.copyFrom(position)
    this._transform.rotation = rotation
    this._transform.scale.set(scale)
  }

  updateVerticesIfNeeded() {
    if (this.shouldUpdateVertices) {
      this.updateVertices()
    }
    this.shouldUpdateVertices = false
  }

  hasAABBIntersection(B: Collider): boolean {
    this.updateVerticesIfNeeded()
    B.updateVerticesIfNeeded()

    return Geometry.isAABBIntersection(this.aabb, B.aabb)
  }

  findContact(B: Collider, includePoints: boolean = false): Collision.Contact | undefined {
    this.updateVerticesIfNeeded()
    B.updateVerticesIfNeeded()

    if (!this.hasAABBIntersection(B)) {
      return
    }

    let contact: Collision.Contact | undefined
    if (B instanceof Collider.Circle) {
      contact = this.findContactWithCircle(B, includePoints)
    } else if (B instanceof Collider.Polygon) {
      contact = this.findContactWithPolygon(B, includePoints)
    }

    return contact
  }

  abstract getProjectionRange(axis: Vector): Range

  abstract findContactWithCircle(
    B: Collider.Circle,
    includePoints: boolean,
  ): Collision.Contact | undefined
  abstract findContactWithPolygon(
    B: Collider.Polygon,
    includePoints: boolean,
  ): Collision.Contact | undefined

  protected updateVertices() {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (let i = 0; i < this.__vertices.length; i++) {
      const v = this._vertices[i]!
      this._transform.matrix.apply(this.__vertices[i]!, v)

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

export namespace Collider {
  export class Circle extends Collider {
    readonly _areaProperties: Geometry.AreaProperties

    get radius(): number {
      return this._radius * this._transform.scale.x
    }

    constructor(
      private readonly _radius: number,
      x: number = 0,
      y: number = 0,
    ) {
      super([])

      this._areaProperties = Geometry.Circle.areaProperties(x, y, _radius)
    }

    getProjectionRange(axis: Vector): Range {
      return Geometry.Circle.projectionRange(this.center, this.radius, axis)
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

    findContactWithPolygon(B: Polygon, includePoints: boolean): Collision.Contact | undefined {
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
      polygon: Polygon,
      out_contact: Collision.Contact,
    ): boolean {
      const closestVerIdx = Geometry.Polygon.getClosestVertexIndexToPoint(
        this.center,
        polygon._vertices,
      )
      const closestVer = polygon._vertices[closestVerIdx]!
      const axis = new Vector()
      closestVer.subtract(this.center, axis).normalize(axis)

      return Geometry.evaluateProjectionOverlap(
        this.getProjectionRange(axis),
        polygon.getProjectionRange(axis),
        axis,
        out_contact,
      )
    }

    private setContactPointsWithPolygon(B: Polygon, out_contact: Collision.Contact) {
      const edge = Geometry.Polygon.getEdgeAcrossNormal(
        B._vertices,
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

  export class Polygon extends Collider {
    readonly _areaProperties: Geometry.AreaProperties

    constructor(vertices: Point[]) {
      super(vertices)

      this._areaProperties = Geometry.Polygon.areaProperties(vertices)
    }

    getAxis(index: number, ref_axis: Vector) {
      this._vertices[(index + 1) % this._vertices.length]!.subtract(
        this._vertices[index]!,
        ref_axis,
      )
        .orthogonalize(ref_axis)
        .normalize(ref_axis)
    }

    getProjectionRange(axis: VectorData): Range {
      return Geometry.Polygon.projectionRange(this._vertices, axis)
    }

    findContactWithCircle(B: Circle, includePoints: boolean): Collision.Contact | undefined {
      const contact = B.findContactWithPolygon(this, includePoints)
      contact?.normal.multiplyScalar(-1, contact.normal)

      return contact
    }

    findContactWithPolygon(B: Polygon, includePoints: boolean): Collision.Contact | undefined {
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

    evaluateContact(B: Collider, out_contact: Collision.Contact): boolean {
      const axis = new Vector()

      for (let i = 0; i < this._vertices.length; i++) {
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

    private setContactPointsWithPolygon(B: Polygon, out_contact: Collision.Contact) {
      const edgeA = Geometry.Polygon.getEdgeAcrossNormal(this._vertices, out_contact.normal)
      const edgeB = Geometry.Polygon.getEdgeAcrossNormal(
        B._vertices,
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
      out_contact.depth = EMath.average(...cps.map((cp) => cp.depth))
    }
  }
}
