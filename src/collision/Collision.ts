import { Point, type PointData } from 'pixi.js'
import { ShapeOverlap } from '.'
import { Collider } from '../components'
import { Circle, ConvexPolygon, Shape, Segment } from '../geometry'

export class Collision {
  _depth: number
  _normal: Point
  _contacts: [Collision.Contact, Collision.Contact] = [
    { point: new Point(), depth: 0 },
    { point: new Point(), depth: 0 },
  ]
  _contactCount = 0

  private readonly props = {
    segments: [new Segment(), new Segment()],
    point: new Point(),
    negNormal: new Point(),
  }

  private constructor(shapeOverlap: ShapeOverlap) {
    this._depth = shapeOverlap.depth
    this._normal = shapeOverlap.normal.clone()
  }

  get totalContactsDepth(): number {
    if (this._contactCount <= 0) {
      return 0
    } else if (this._contactCount === 1) {
      return this._contacts[0].depth
    } else {
      return this._contacts[0].depth + this._contacts[1].depth
    }
  }

  static from(a: Collider, b: Collider): Collision | undefined {
    const overlap = ShapeOverlap.from(a._shape, b._shape)
    if (!overlap) {
      return
    }
    const col = new this(overlap)
    this.setContacts(a._shape, b._shape, col)
    return col
  }

  private static setContacts(a: Shape, b: Shape, c: Collision) {
    if (a instanceof Circle) {
      if (b instanceof Circle) {
        return this.setContactsFromCircleToCircle(a, b, c)
      } else if (b instanceof ConvexPolygon) {
        return this.setContactsFromCircleToPolygon(a, b, c)
      }
    } else if (a instanceof ConvexPolygon) {
      if (b instanceof Circle) {
        return this.setContactsFromPolygonToCircle(a, b, c)
      } else if (b instanceof ConvexPolygon) {
        return this.setContactsFromPolygonToPolygon(a, b, c)
      }
    }
    throw new Error('Undefined collision')
  }

  private static setContactsFromCircleToCircle(a: Circle, b: Circle, c: Collision) {
    c._contactCount = 1
    const contact = c._contacts[0]
    contact.point = a._center.add(c._normal.multiplyByScalar(b.radius))
    contact.depth = c._depth
  }

  private static setContactsFromCircleToPolygon(a: Circle, b: ConvexPolygon, c: Collision) {
    c._contactCount = 1
    const contact = c._contacts[0]
    b.getSideAcross(c.props.negNormal).getClosestPoint(a._center, contact.point)
    contact.depth = c._depth
  }

  private static setContactsFromPolygonToCircle(a: ConvexPolygon, b: Circle, c: Collision) {
    c._contactCount = 1
    const contact = c._contacts[0]
    a.getSideAcross(c._normal).getClosestPoint(b._center, contact.point)
    contact.depth = c._depth
  }

  private static setContactsFromPolygonToPolygon(a: ConvexPolygon, b: ConvexPolygon, c: Collision) {
    const normal = c._normal
    const sa = a.getSideAcross(normal, c.props.segments[0])
    const sb = b.getSideAcross(normal.multiplyByScalar(-1), c.props.segments[1])
    // 'Reference' and 'Incident' sides; Ref. is the most perpendicular to the collision's Normal,
    // and thus used to clip the Incident side's vertices to get the collision contact points
    // Source: https://dyn4j.org/2011/11/contact-points-using-clipping/
    let ref: Segment, inc: Segment
    if (Math.abs(sa._vector.dot(normal)) <= Math.abs(sb._vector.dot(normal))) {
      ref = sa
      inc = sb
    } else {
      ref = sb
      inc = sa
    }
    const clip_normal = ref._vector.normalize()
    let clip_margin = -1 * clip_normal.dot(ref.p0) // margin opposite to normal
    inc.clipByMarginAlongRef(clip_margin, clip_normal)

    clip_normal.multiplyByScalar(-1, clip_normal)
    clip_margin = clip_normal.dot(ref.p1) // margin opposite to normal
    inc.clipByMarginAlongRef(clip_margin, clip_normal)

    const ref_normal = ref._vector.normalize().orthogonalize()
    const ref_p0_proj = ref_normal.dot(ref.p0)
    const setContactPoint = (inc_point: PointData) => {
      let depth = ref_normal.dot(inc_point) - ref_p0_proj
      if (depth < 0) return
      const i = c._contactCount
      c._contacts[i].depth = depth
      c._contacts[i].point.copyFrom(inc_point)
      c._contactCount++
    }
    setContactPoint(inc.p0)
    setContactPoint(inc.p1)
  }
}

export namespace Collision {
  export interface Contact {
    point: Point
    depth: number
  }
}
