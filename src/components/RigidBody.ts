import { Transform, type PointData } from 'pixi.js'
import { Collider, Vector, type VectorData } from '..'
import { calculateShapeProperties, Physics } from '../physics'
import { EMath } from '../extras'

export class RigidBody extends Transform {
  type: RigidBody.Type = 'dynamic'

  readonly velocity = new Vector()
  readonly _drag = new Vector()

  angularVelocity = 0
  _angularDrag = 0

  readonly _force = new Vector()
  torque = 0

  _restitution = 0.1
  readonly _friction: Physics.Friction = {
    static: 0.5,
    dynamic: 0.3,
  }

  private _mass?: number
  private _moi?: number // Moment of Inertia
  private _invMass = 0
  private _invMoi = 0

  constructor(options?: Partial<RigidBody.Options>) {
    super()

    if (options?.type) this.type = options.type

    if (options?.initialPosition) this.position.copyFrom(options.initialPosition)
    if (options?.initialRotation) this.rotation = options.initialRotation
    if (options?.initialVelocity) this.velocity.copyFrom(options.initialVelocity)
    if (options?.initialAngularVelocity) this.angularVelocity = options.initialAngularVelocity

    if (options?.restitution != undefined) this.restitution = options?.restitution
    if (options?.friction) this.friction = options.friction

    // if (options?.drag) this.setDrag(options.drag)
    // if (options?.angularDrag != undefined) this.setAngularDrag(options.angularDrag)
  }

  get direction(): Vector {
    return new Vector(Math.cos(this.rotation), Math.sin(this.rotation))
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

  resetShapeProperties(collider: Collider, pixelsPerMeter: number) {
    if (this.type === 'static') {
      return
    }
    const properties = calculateShapeProperties(collider._shape, 1, pixelsPerMeter)
    this._mass = EMath.clamp(properties.mass, 0, Infinity)
    this._invMass = this._mass > 0 ? 1 / this._mass : 0
    this._moi = EMath.clamp(properties.momentOfInertia, 0, Infinity)
    this._invMoi = this._moi > 0 ? 1 / this._moi : 0
    // console.log(this._mass, this._moi)
  }

  // setDrag(value: Partial<VectorData>) {
  //   const adjustValue = (val: number) => Math.pow(EMath.clamp01(val), 4)
  //   if (value.x != undefined) this._drag.x = adjustValue(value.x)
  //   if (value.y != undefined) this._drag.y = adjustValue(value.y)
  // }

  // setAngularDrag(value: number) {
  //   this._angularDrag = Math.pow(EMath.clamp01(value), 4)
  // }

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
    initialRotation: number
    initialVelocity: VectorData
    initialAngularVelocity: number

    restitution: number
    friction: Partial<Physics.Friction>

    drag: VectorData
    angularDrag: number
  }
}
