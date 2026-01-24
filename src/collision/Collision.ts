import { Point, PointData } from 'pixi.js'
import { Collider } from './Collider'
import { RigidBody } from '../components'
import { VectorData } from '../core'

export namespace Collision {
  export type LayerMap = Map<number, number>

  export interface Ray {
    origin: Point
    target: Point
    collisionMask: number
    intersects: boolean
  }
  export const ray = (
    origin: Point,
    directionNorm: VectorData,
    distance: number,
    collisionMask: number,
  ): Ray => ({
    origin,
    target: new Point(directionNorm.x * distance, directionNorm.y * distance),
    collisionMask,
    intersects: false,
  })

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
