import { Transform, type PointData } from 'pixi.js'
import { Vector, type VectorData } from '..'
import { Physics } from '../physics'
import { EMath } from '../extras'

export class RigidBody extends Transform {
  type: RigidBody.Type = 'dynamic'

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

  private _mass = 0
  private _invMass = 0
  private _inertia = 0
  private _invInertia = 0

  constructor(options?: Partial<RigidBody.Options>) {
    super()

    if (options?.type) this.type = options.type

    if (options?.initialPosition)
      this.position.set(options.initialPosition.x, options.initialPosition.y)

    if (options?.restitution != undefined) this.setRestitution(options?.restitution)
    if (options?.friction) this.setFriction(options.friction)

    if (options?.drag) this.setDrag(options.drag)
    if (options?.angularDrag != undefined) this.setAngularDrag(options.angularDrag)

    if (options?.initialVelocity) this.velocity.copyFrom(options.initialVelocity)
    if (options?.initialAngularVelocity) this.angularVelocity = options.initialAngularVelocity
  }

  get mass(): number {
    return this._mass
  }
  get invMass(): number {
    return this._invMass
  }
  set mass(value: number) {
    if (this.type === 'static') return

    this._mass = EMath.clamp(value, 0, Infinity)
    this._invMass = this._mass > 0 ? 1 / this._mass : 0
  }

  get inertia(): number {
    return this._inertia
  }
  get invInertia(): number {
    return this._invInertia
  }
  set inertia(value: number) {
    if (this.type === 'static') return

    this._inertia = EMath.clamp(value, 0, Infinity)
    this._invInertia = this._inertia > 0 ? 1 / this._inertia : 0
  }

  get direction(): Vector {
    return new Vector(Math.cos(this.rotation), Math.sin(this.rotation))
  }

  resetAreaProperties(properties: Physics.AreaProperties) {
    this.mass = properties.mass
    this.inertia = properties.momentOfInertia
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
    this.torque += this.matrix
      .applyInverse(position ?? this.position) // ??
      .cross(force)
  }
}

export namespace RigidBody {
  export type Type = 'dynamic' | 'kinematic' | 'static'

  export interface Options {
    type: RigidBody.Type

    initialPosition: PointData
    initialVelocity: VectorData
    initialAngularVelocity: number

    restitution: number
    friction: Partial<Physics.Friction>

    drag: VectorData
    angularDrag: number
  }
}
