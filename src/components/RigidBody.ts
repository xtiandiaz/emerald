import { Transform, Point, type PointData } from 'pixi.js'
import { Vector, type Component, type VectorData } from '../core'
import { Physics } from '../physics'
import { EMath } from '../extras'

export class RigidBody implements Component {
  readonly _transform = new Transform()

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

  private _mass = 0
  private _invMass = 0
  private _inertia = 0
  private _invInertia = 0

  constructor(options?: Partial<RigidBody.Options>) {
    this.isStatic = options?.isStatic ?? false
    this.isKinematic = options?.isKinematic ?? false

    if (options?.restitution != undefined) this.setRestitution(options?.restitution)
    if (options?.friction) this.setFriction(options.friction)

    if (options?.drag) this.setDrag(options.drag)
    if (options?.angularDrag != undefined) this.setAngularDrag(options.angularDrag)

    if (options?.initialVelocity) this.velocity.copyFrom(options.initialVelocity)
    if (options?.initialAngularVelocity) this.angularVelocity = options.initialAngularVelocity
  }

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

  get mass(): number {
    return this._mass
  }
  get invMass(): number {
    return this._invMass
  }
  set mass(value: number) {
    if (this.isStatic) return

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
    if (this.isStatic) return

    this._inertia = EMath.clamp(value, 0, Infinity)
    this._invInertia = this._invInertia > 0 ? 1 / this._invInertia : 0
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
    this.torque += this._transform.matrix
      .applyInverse(position ?? this._transform.position) // ??
      .cross(force)
  }
}

export namespace RigidBody {
  export interface Options {
    isStatic: boolean
    isKinematic: boolean

    initialVelocity: VectorData
    initialAngularVelocity: number

    restitution: number
    friction: Partial<Physics.Friction>

    drag: VectorData
    angularDrag: number
  }
}
