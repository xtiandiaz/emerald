import { Collider } from './Collider'
import { RigidBody } from '../components'
import { VectorData } from '../core'

export namespace Collision {
  export type LayerMap = Map<number, number>

  export interface Contact extends Collider.Contact {
    A: RigidBody
    B: RigidBody
    points: Collider.ContactPoint[]
  }

  export interface Instance {
    colliderId: number
    direction: VectorData
  }

  export const instance = (
    colliderId: number,
    contact: Collider.Contact,
    invertDirection: boolean,
  ): Instance => {
    return { colliderId, direction: contact.normal.multiplyScalar(invertDirection ? -1 : 1) }
  }

  export interface Tracker {
    collisions: Map<number, Instance>
  }
}
