import { Transform, type PointData } from 'pixi.js'
import { Vector, Component, clamp01, type VectorData } from '../core'
import { Collider } from '../collision'
import { Physics } from '../physics'

export interface BodyOptions {
  isStatic: boolean
  isKinematic: boolean
  layer: number

  position: PointData
  rotation: number
  scale: number

  restitution: number
  friction: Partial<Physics.Friction>

  drag: VectorData
  angularDrag: number
}

export class Body extends Component implements Collider {
  readonly collidedIds = new Set<number>()

  isStatic: boolean
  isKinematic: boolean

  layer: number

  readonly transform = new Transform()

  readonly velocity = new Vector()
  readonly _drag = new Vector()

  angularVelocity = 0
  _angularDrag = 0

  readonly force = new Vector()
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

  constructor(
    public readonly shape: Collider.Shape,
    options?: Partial<BodyOptions>,
  ) {
    super()

    this.isStatic = options?.isStatic ?? false
    this.isKinematic = options?.isKinematic ?? false
    this.layer = options?.layer ?? 1

    this.mass = this.isStatic ? 0 : shape.areaProperties.mass
    this.invMass = this.mass > 0 ? 1 / this.mass : 0
    this.inertia = this.isStatic ? 0 : shape.areaProperties.momentOfInertia
    this.invInertia = this.inertia > 0 ? 1 / this.inertia : 0

    if (options?.restitution) this.setRestitution(options?.restitution)
    if (options?.friction) this.setFriction(options.friction)

    if (options?.drag) this.setDrag(options.drag)
    if (options?.angularDrag) this.setAngularDrag(options.angularDrag)

    this.transform = new Transform({
      observer: {
        _onUpdate: (transform) => this.shape.transform.setFromMatrix(transform.matrix),
      },
    })
    this.transform.position.set(options?.position?.x, options?.position?.y)
    this.transform.rotation = options?.rotation ?? 0
    this.transform.scale.set(options?.scale ?? 1)
  }

  setRestitution(value: number) {
    this._restitution = clamp01(value)
  }

  setFriction(value: Partial<Physics.Friction>) {
    const adjustValue = (val: number) => clamp01(val)
    if (value.static) this._friction.static = adjustValue(value.static)
    if (value.dynamic) this._friction.dynamic = adjustValue(value.dynamic)
  }

  setDrag(value: Partial<VectorData>) {
    const adjustValue = (val: number) => Math.pow(clamp01(val), 4)
    if (value.x) this._drag.x = adjustValue(value.x)
    if (value.y) this._drag.y = adjustValue(value.y)
  }

  setAngularDrag(value: number) {
    this._angularDrag = Math.pow(clamp01(value), 4)
  }

  applyForce(force: PointData, position?: PointData) {
    // https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/3angularmotion/Physics%20-%20Angular%20Motion.pdf
    this.force.add(force, this.force)
    this.torque += this.transform.matrix
      .applyInverse(position ?? this.transform.position) // ??
      .cross(force)
  }
}
