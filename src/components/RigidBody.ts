import { Transform, type PointData } from 'pixi.js'
import { Circle, Collider, Vector, type VectorData } from '..'
import { calculateShapeProperties, Physics } from '../physics'
import { EMath } from '../extras'

export class RigidBody extends Transform {
  type: RigidBody.Type = 'dynamic'

  readonly velocity = new Vector()
  private readonly _drag = new Vector() // e.g. air or water's 'impact'

  angularVelocity = 0
  private _angularDrag = 0 // to use in combination with drag

  readonly _force = new Vector()
  torque = 0

  _restitution = 0.2
  readonly _friction: Physics.Friction = {
    static: 0.5,
    dynamic: 0.3,
  }

  private _mass = 0
  private _moi = 0 // Moment of Inertia
  private _invMass = 0
  private _invMoi = 0

  constructor(options?: Partial<RigidBody.Options>) {
    super()

    if (options?.type) this.type = options.type

    if (options?.initialPosition) this.position.copyFrom(options.initialPosition)
    if (options?.initialRotation) this.rotation = options.initialRotation
    if (options?.initialVelocity) this.velocity.copyFrom(options.initialVelocity)
    if (options?.initialAngularVelocity) this.angularVelocity = options.initialAngularVelocity

    if (options?.restitution != undefined) this.restitution = options.restitution
    if (options?.friction != undefined) this.friction = options.friction

    if (options?.drag) this.drag = options.drag
    if (options?.angularDrag) this.angularDrag = options.angularDrag
  }

  get direction(): Vector {
    return new Vector(Math.cos(this.rotation), Math.sin(this.rotation))
  }

  get mass(): number {
    return this._mass
  }
  get invMass(): number {
    return this._invMass
  }
  get invMoi(): number {
    return this._invMoi
  }

  set restitution(value: number) {
    this._restitution = EMath.clamp01(value)
  }
  set friction(value: Partial<Physics.Friction>) {
    const adjustValue = (val: number) => EMath.clamp01(val)
    if (value.static != undefined) this._friction.static = adjustValue(value.static)
    if (value.dynamic != undefined) this._friction.dynamic = adjustValue(value.dynamic)
  }

  get drag(): VectorData {
    return this._drag
  }
  set drag(value: number | VectorData) {
    if (typeof value === 'number') {
      const val = RigidBody.dampenDrag(value)
      this._drag.set(val, val)
    } else {
      this._drag.set(RigidBody.dampenDrag(value.x), RigidBody.dampenDrag(value.y))
    }
  }
  get angularDrag(): number {
    return this._angularDrag
  }
  set angularDrag(value: number) {
    this._angularDrag = RigidBody.dampenDrag(value)
  }

  resetShapeProperties(collider: Collider, pixelsPerMeter: number) {
    if (this.type === 'static') {
      return
    }
    const properties = calculateShapeProperties(collider._shape, 1, pixelsPerMeter)
    this._mass = EMath.clamp(properties.mass, 0, Infinity)
    this._moi = EMath.clamp(properties.momentOfInertia, 0, Infinity)
    this._invMass = this._mass > 0 ? 1 / this._mass : 0
    this._invMoi = this._moi > 0 ? 1 / this._moi : 0

    // Exceptional drag to apply extra 'friction' to circles
    if (collider._shape instanceof Circle) {
      this.angularDrag = 0.25
    }
  }

  applyForce(force: PointData, position?: PointData) {
    if (this.type === 'static') {
      return
    }
    // https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/3angularmotion/Physics%20-%20Angular%20Motion.pdf
    this._force.add(force, this._force)
    this.torque += this.matrix
      .applyInverse(position ?? this.position) // ??
      .cross(force)
  }

  private static dampenDrag(value: number) {
    return Math.pow(EMath.clamp01(value), 4)
  }
}

export namespace RigidBody {
  export type Type = 'dynamic' | 'kinematic' | 'static'

  export interface Options {
    type: RigidBody.Type

    initialPosition: PointData
    initialRotation: number
    initialVelocity: VectorData
    initialAngularVelocity: number

    restitution: number
    friction: Partial<Physics.Friction>
    drag: number | VectorData
    angularDrag: number
  }
}
