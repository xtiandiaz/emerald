import { Point } from 'pixi.js'
import { Collider } from '.'
import { Geometry } from '../geometry'
import { Body } from '../components'

export interface Collision extends Collision.Contact {
  A: Body
  B: Body
  points: Collision.ContactPoint[]
}
export namespace Collision {
  export type LayerMap = Map<number, number>

  export interface ContactPoint {
    point: Point
    depth: number
  }

  export interface Contact extends Geometry.ProjectionOverlap {
    points?: ContactPoint[]
  }

  export function canCollide(layerA: number, layerB: number, map?: LayerMap): boolean {
    return !map || (((map.get(layerA) ?? 0) & layerB) | ((map.get(layerB) ?? 0) & layerA)) != 0
  }

  export function correctDirectionIfNeeded(
    A: Collider.Shape,
    B: Collider.Shape,
    out_contact: Contact,
  ) {
    if (B.center.subtract(A.center).dot(out_contact.normal) < 0) {
      out_contact.normal.multiplyScalar(-1, out_contact.normal)
    }
  }
}
