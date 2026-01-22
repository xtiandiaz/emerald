import { Transform, Point, type PointData } from 'pixi.js'
import { Vector, Component, type VectorData } from '../core'
import { Collider, Collision } from '../collision'
import { Physics } from '../physics'
import { EMath } from '../extras'

export class RigidBody implements Component, Collision.Tracker {
  readonly collisions = new Map<number, Collision.Instance>()

  isStatic: boolean
  isKinematic: boolean

  readonly velocity = new Vector()
  readonly _drag = new Vector()

  angularVelocity = 0
  _angularDrag = 0

  readonly _force = new Vector()
  torque = 0

  _restitution = 0.2
  readonly _friction: Physics.Friction = {
    static: 0.5,
    dynamic: 0.3,
  }

  readonly mass: number
  readonly invMass: number
  readonly inertia: number
  readonly invInertia: number

  readonly _transform: Transform
  get position(): Point {
    return this._transform.position
  }
  get rotation(): number {
    return this._transform.rotation
  }
  set rotation(value: number) {
    this._transform.rotation = value
  }
  get scale(): number {
    return this._transform.scale.x
  }

  get direction(): Vector {
    return new Vector(Math.cos(this.rotation), Math.sin(this.rotation))
  }

  constructor(
    public readonly collider: Collider,
    options?: Partial<RigidBody.Options>,
  ) {
    collider.layer = options?.layer ?? 1

    this._transform = collider._transform

    this.isStatic = options?.isStatic ?? false
    this.isKinematic = options?.isKinematic ?? false

    this.mass = this.isStatic ? 0 : collider._areaProperties.mass
    this.invMass = this.mass > 0 ? 1 / this.mass : 0
    this.inertia = this.isStatic ? 0 : collider._areaProperties.momentOfInertia
    this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0

    if (options?.restitution != undefined) this.setRestitution(options?.restitution)
    if (options?.friction) this.setFriction(options.friction)

    if (options?.drag) this.setDrag(options.drag)
    if (options?.angularDrag != undefined) this.setAngularDrag(options.angularDrag)

    if (options?.initialPosition) this._transform.position.copyFrom(options.initialPosition)
    if (options?.initialRotation) this._transform.rotation = options.initialRotation
    if (options?.initialScale != undefined) this._transform.scale.x = options.initialScale

    if (options?.initialVelocity) this.velocity.copyFrom(options.initialVelocity)
    if (options?.initialAngularVelocity) this.angularVelocity = options.initialAngularVelocity
  }

  setRestitution(value: number) {
    this._restitution = EMath.clamp01(value)
  }

  setFriction(value: Partial<Physics.Friction>) {
    const adjustValue = (val: number) => EMath.clamp01(val)
    if (value.static != undefined) this._friction.static = adjustValue(value.static)
    if (value.dynamic != undefined) this._friction.dynamic = adjustValue(value.dynamic)
  }

  setDrag(value: Partial<VectorData>) {
    const adjustValue = (val: number) => Math.pow(EMath.clamp01(val), 4)
    if (value.x != undefined) this._drag.x = adjustValue(value.x)
    if (value.y != undefined) this._drag.y = adjustValue(value.y)
  }

  setAngularDrag(value: number) {
    this._angularDrag = Math.pow(EMath.clamp01(value), 4)
  }

  applyForce(force: PointData, position?: PointData) {
    // https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/3angularmotion/Physics%20-%20Angular%20Motion.pdf
    this._force.add(force, this._force)
    this.torque += this._transform.matrix
      .applyInverse(position ?? this._transform.position) // ??
      .cross(force)
  }
}

export namespace RigidBody {
  export interface Options {
    isStatic: boolean
    isKinematic: boolean
    layer: number

    initialPosition: PointData
    initialRotation: number
    initialScale: number

    initialVelocity: VectorData
    initialAngularVelocity: number

    restitution: number
    friction: Partial<Physics.Friction>

    drag: VectorData
    angularDrag: number
  }
}
