import { Vector, Range, VectorData } from '../core'
import { Collider } from '../components'
import { Geometry } from '../geometry'
import { EMath } from '../extras'
import { Point } from 'pixi.js'

export namespace Colliders {
  export class Circle extends Collider {
    readonly _areaProperties: Geometry.AreaProperties

    constructor(
      private readonly _radius: number,
      options?: Partial<Collider.Options>,
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

    findContactWithCircle(B: Circle, includePoints: boolean): Collider.Contact | undefined {
      const radii = this.radius + B.radius
      const diffPos = B.center.subtract(this.center)
      const distSqrd = diffPos.magnitudeSquared()
      if (distSqrd >= radii * radii) {
        return
      }
      const dist = Math.sqrt(distSqrd)
      const normal = diffPos.divideByScalar(dist)
      const depth = radii - dist

      const contact: Collider.Contact = { depth, normal }
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

    findContactWithPolygon(B: Polygon, includePoints: boolean): Collider.Contact | undefined {
      const contact: Collider.Contact = { depth: Infinity, normal: new Vector() }
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

    protected evaluateContactWithPolygon(polygon: Polygon, out_contact: Collider.Contact): boolean {
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

    private setContactPointsWithPolygon(B: Polygon, out_contact: Collider.Contact) {
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

    constructor(vertices: Point[], options?: Partial<Collider.Options>) {
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

    findContactWithCircle(B: Circle, includePoints: boolean): Collider.Contact | undefined {
      const contact = B.findContactWithPolygon(this, includePoints)
      contact?.normal.multiplyScalar(-1, contact.normal)

      return contact
    }

    findContactWithPolygon(B: Polygon, includePoints: boolean): Collider.Contact | undefined {
      const contact: Collider.Contact = { depth: Infinity, normal: new Vector() }
      if (!this.evaluateContact(B, contact) || !B.evaluateContact(this, contact)) {
        return
      }

      this.correctContactDirectionIfNeeded(B, contact)

      if (includePoints) {
        this.setContactPointsWithPolygon(B, contact)
      }
      return contact
    }

    evaluateContact(B: Collider, out_contact: Collider.Contact): boolean {
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

    private setContactPointsWithPolygon(B: Polygon, out_contact: Collider.Contact) {
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

      const cps: Collider.ContactPoint[] = []
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
