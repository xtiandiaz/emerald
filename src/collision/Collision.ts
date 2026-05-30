import { Point, type PointData } from 'pixi.js'
import { ShapeOverlap } from '.'
import { Collider } from '../components'
import { Circle, ConvexPolygon, Shape, Segment } from '../geometry'

export class Collision extends ShapeOverlap {
  _contacts: [Collision.Contact, Collision.Contact] = [
    { point: new Point(), depth: 0 },
    { point: new Point(), depth: 0 },
  ]
  _contactCount = 0

  // Props:
  private readonly __segs: [Segment, Segment] = [new Segment(), new Segment()]

  get hasContact(): boolean {
    return this._contactCount > 0
  }

  static from(a: Collider, b: Collider, out_c?: Collision): Collision {
    out_c ??= new Collision()
    out_c._contactCount = 0

    ShapeOverlap._from(a._shape, b._shape, out_c)
    if (out_c.hasOverlap) {
      this.setContacts(a._shape, b._shape, out_c)
    }
    return out_c
  }

  private static setContacts(a: Shape, b: Shape, c: Collision) {
    if (a instanceof Circle) {
      if (b instanceof Circle) {
        this.setContactsFromCircleToCircle(a, b, c)
      } else if (b instanceof ConvexPolygon) {
        this.setContactsFromCircleToPolygon(a, b, c)
      }
    } else if (a instanceof ConvexPolygon) {
      if (b instanceof Circle) {
        this.setContactsFromPolygonToCircle(a, b, c)
      } else if (b instanceof ConvexPolygon) {
        this.setContactsFromPolygonToPolygon(a, b, c)
      }
    } else {
      throw new Error('Undefined collision')
    }
  }

  private static setContactsFromCircleToCircle(a: Circle, b: Circle, c: Collision) {
    c._contactCount = 1
    const contact = c._contacts[0]
    contact.point = a._center.add(c._normal.multiplyByScalar(a.radius))
    contact.depth = c._depth
  }

  private static setContactsFromCircleToPolygon(a: Circle, b: ConvexPolygon, c: Collision) {
    c._contactCount = 1
    const contact = c._contacts[0]
    b.getSideAcross(c._negNormal).getClosestPoint(a._center, contact.point)
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
    const sa = a.getSideAcross(normal, c.__segs[0])
    const sb = b.getSideAcross(normal.multiplyByScalar(-1), c.__segs[1])
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
    const clip_normal = ref._vector.normalize(c.__v)
    let clip_margin = -1 * clip_normal.dot(ref.p0) // margin opposite to normal
    inc.clipByMarginAlongRef(clip_margin, clip_normal)

    clip_normal.multiplyByScalar(-1, clip_normal)
    clip_margin = clip_normal.dot(ref.p1) // margin opposite to normal
    inc.clipByMarginAlongRef(clip_margin, clip_normal)

    const ref_normal = ref._vector.normalize(c.__v).orthogonalize(c.__v)
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
