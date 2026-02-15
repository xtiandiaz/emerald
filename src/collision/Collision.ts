import { Matrix, Point, Transform, type PointData } from 'pixi.js'
import { Vector, Range, type VectorData } from '../core'
import { Geometry } from '../geometry'
import { EMath } from '../extras'

export namespace Collision {
  export type LayerMap = Map<number, number>

  export interface Instance extends Shape.Contact {
    colliderId: number
  }

  export class Ray {
    intersects = false

    constructor(
      public readonly origin: Point,
      public readonly target: Point,
      public collisionMask: number,
    ) {}

    canCollide(layer: number) {
      return (this.collisionMask & layer) != 0
    }

    transform(matrix: Matrix, out_ray?: Ray): Ray {
      if (!out_ray) {
        out_ray = new Ray(new Point(), new Point(), this.collisionMask)
      } else {
        out_ray.collisionMask = this.collisionMask
      }
      // TODO Figure out how to prevent rotation or to incorporate it correctly
      // matrix.apply(this.origin, out_ray.origin)
      // matrix.apply(this.target, out_ray.target)
      this.origin.add({ x: matrix.tx, y: matrix.ty }, out_ray.origin)
      this.target.add({ x: matrix.tx, y: matrix.ty }, out_ray.target)

      return out_ray
    }
  }

  export const ray = (
    origin: Point,
    directionNorm: VectorData,
    distance: number,
    collisionMask: number,
  ): Ray => {
    return new Ray(
      new Point().copyFrom(origin),
      new Point(origin.x + directionNorm.x * distance, origin.y + directionNorm.y * distance),
      collisionMask,
    )
  }

  export abstract class Shape {
    layer: number
    readonly contacts = new Map<number, Shape.Contact>()

    abstract readonly _areaProperties: Geometry.AreaProperties
    readonly _vertices: Point[]
    readonly _transform: Transform
    readonly _aabb: Geometry.AABB = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
    private shouldUpdateVertices = true

    protected constructor(
      protected readonly _localVertices: Point[],
      options?: Partial<Shape.Options>,
    ) {
      this._vertices = _localVertices.map((v) => v.clone())
      this._transform = new Transform({
        observer: {
          _onUpdate: (_) => {
            this.shouldUpdateVertices = true
          },
        },
      })
      this.layer = options?.layer ?? 0
    }

    get center(): Point {
      return this._transform.position.add(this.centroid)
    }
    protected get centroid(): Point {
      return this._areaProperties.centroid
    }

    updateVerticesIfNeeded() {
      if (this.shouldUpdateVertices) {
        this.updateVertices()
      }
      this.shouldUpdateVertices = false
    }

    canCollide(B: Shape, map?: Collision.LayerMap): boolean {
      return (
        !map ||
        (((map.get(this.layer) ?? 0) & B.layer) | ((map.get(B.layer) ?? 0) & this.layer)) != 0
      )
    }

    hasAABBIntersection(B: Shape): boolean {
      this.updateVerticesIfNeeded()
      B.updateVerticesIfNeeded()

      return Geometry.isAABBIntersection(this._aabb, B._aabb)
    }

    findContact(B: Shape, includePoints: boolean = false): Shape.Contact | undefined {
      this.updateVerticesIfNeeded()
      B.updateVerticesIfNeeded()

      if (!this.hasAABBIntersection(B)) {
        return
      }

      let contact: Shape.Contact | undefined
      if (B instanceof Shape.Circle) {
        contact = this.findContactWithCircle(B, includePoints)
      } else if (B instanceof Shape.Polygon) {
        contact = this.findContactWithPolygon(B, includePoints)
      }

      return contact
    }

    evaluateRayIntersection(ray: Collision.Ray) {
      ray.intersects = false

      if ((this.layer & ray.collisionMask) == 0) {
        return
      }

      this.updateVerticesIfNeeded()

      const axis = new Vector()
      ray.target.subtract(ray.origin, axis).normalize(axis)

      ray.intersects = Geometry.hasProjectionOverlap(this.getProjectionRange(axis), {
        min: axis.dot(ray.origin),
        max: axis.dot(ray.target),
      })

      axis.orthogonalize(axis)

      ray.intersects &&= Geometry.hasProjectionOverlap(
        this.getProjectionRange(axis),
        Range.point(axis.dot(ray.origin)),
      )
    }

    abstract getProjectionRange(axis: Vector): Range

    abstract findContactWithCircle(
      B: Shape.Circle,
      includePoints: boolean,
    ): Shape.Contact | undefined
    abstract findContactWithPolygon(
      B: Shape.Polygon,
      includePoints: boolean,
    ): Shape.Contact | undefined

    protected updateVertices() {
      const matrix = this._transform.matrix
      let minX = Infinity
      let maxX = -Infinity
      let minY = Infinity
      let maxY = -Infinity

      for (let i = 0; i < this._localVertices.length; i++) {
        const v = this._vertices[i]!
        matrix.apply(this._localVertices[i]!, v)

        minX = Math.min(minX, v.x)
        maxX = Math.max(maxX, v.x)
        minY = Math.min(minY, v.y)
        maxY = Math.max(maxY, v.y)
      }
      this._aabb.min.x = minX
      this._aabb.min.y = minY
      this._aabb.max.x = maxX
      this._aabb.max.y = maxY
    }

    protected correctContactDirectionIfNeeded(B: Shape, out_contact: Shape.Contact) {
      if (B.center.subtract(this.center).dot(out_contact.normal) < 0) {
        out_contact.normal.multiplyScalar(-1, out_contact.normal)
      }
    }
  }

  export namespace Shape {
    export interface Options {
      layer: number
      localOffset: PointData
    }

    export interface ContactPoint {
      point: Point
      depth: number
    }

    export interface Contact extends Geometry.ProjectionOverlap {
      points?: ContactPoint[]
    }

    export class Circle extends Shape {
      readonly _areaProperties: Geometry.AreaProperties

      constructor(
        private readonly _radius: number,
        options?: Partial<Shape.Options>,
      ) {
        super([], options)

        this._areaProperties = Geometry.Circle.areaProperties(_radius, 1, options?.localOffset)
      }

      get radius(): number {
        return this._radius * this._transform.scale.x
      }

      getProjectionRange(axis: Vector): Range {
        return Geometry.Circle.projectionRange(this.center, this.radius, axis)
      }

      findContactWithCircle(B: Circle, includePoints: boolean): Shape.Contact | undefined {
        const radii = this.radius + B.radius
        const diffPos = B.center.subtract(this.center)
        const distSqrd = diffPos.magnitudeSquared()
        if (distSqrd >= radii * radii) {
          return
        }
        const dist = Math.sqrt(distSqrd)
        const normal = diffPos.divideByScalar(dist)
        const depth = radii - dist

        const contact: Shape.Contact = { depth, normal }
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

      findContactWithPolygon(B: Polygon, includePoints: boolean): Shape.Contact | undefined {
        const contact: Shape.Contact = { depth: Infinity, normal: new Vector() }
        if (!this.evaluateContactWithPolygon(B, contact) || !B.evaluateContact(this, contact)) {
          return
        }

        this.correctContactDirectionIfNeeded(B, contact)

        if (includePoints) {
          this.setContactPointsWithPolygon(B, contact)
        }
        return contact
      }

      protected updateVertices(): void {
        this._aabb.min.x = this._transform.position.x - this.radius
        this._aabb.min.y = this._transform.position.y - this.radius
        this._aabb.max.x = this._transform.position.x + this.radius
        this._aabb.max.y = this._transform.position.y + this.radius
      }

      protected evaluateContactWithPolygon(polygon: Polygon, out_contact: Shape.Contact): boolean {
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

      private setContactPointsWithPolygon(B: Polygon, out_contact: Shape.Contact) {
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

    export class Polygon extends Shape {
      readonly _areaProperties: Geometry.AreaProperties

      constructor(vertices: Point[], options?: Partial<Shape.Options>) {
        super(vertices, options)

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

      findContactWithCircle(B: Circle, includePoints: boolean): Shape.Contact | undefined {
        const contact = B.findContactWithPolygon(this, includePoints)
        contact?.normal.multiplyScalar(-1, contact.normal)

        return contact
      }

      findContactWithPolygon(B: Polygon, includePoints: boolean): Shape.Contact | undefined {
        const contact: Shape.Contact = { depth: Infinity, normal: new Vector() }
        if (!this.evaluateContact(B, contact) || !B.evaluateContact(this, contact)) {
          return
        }

        this.correctContactDirectionIfNeeded(B, contact)

        if (includePoints) {
          this.setContactPointsWithPolygon(B, contact)
        }
        return contact
      }

      evaluateContact(B: Shape, out_contact: Shape.Contact): boolean {
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

      private setContactPointsWithPolygon(B: Polygon, out_contact: Shape.Contact) {
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

        const cps: Shape.ContactPoint[] = []
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
}
