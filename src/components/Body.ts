import { Point, Transform, type PointData } from 'pixi.js'
import { Vector, Component, clamp01 } from '../core'
import { Collider } from '../collision'
import { Physics } from '../physics'

export interface BodyOptions {
  isStatic: boolean
  isKinematic: boolean
  layer?: number

  position: PointData
  rotation: number

  restitution: number
  friction: Physics.Friction
  angularDrag: number
}

export class Body extends Component implements Collider, BodyOptions {
  readonly collidedIds = new Set<number>()

  isStatic: boolean
  isKinematic: boolean

  layer: number

  readonly velocity = new Vector()
  readonly force = new Vector()

  angularVelocity = 0
  torque = 0

  readonly transform = new Transform()
  get position(): Point {
    return this.transform.position
  }
  get rotation(): number {
    return this.transform.rotation
  }

  private _restitution = 0.2
  public get restitution(): number {
    return this._restitution
  }
  public set restitution(value: number) {
    this._restitution = clamp01(value)
  }

  private _friction: Physics.Friction = {
    static: 0.5,
    dynamic: 0.3,
  }
  public get friction(): Physics.Friction {
    return this._friction
  }
  public set friction(value: Physics.Friction) {
    this._friction = { static: clamp01(value.static), dynamic: clamp01(value.dynamic) }
  }

  private _angularDrag = 0
  get angularDrag(): number {
    return this._angularDrag
  }
  set angularDrag(value: number) {
    this._angularDrag = Math.pow(clamp01(value), 4)
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

    this.restitution = options?.restitution ?? this._restitution
    this.friction = options?.friction ?? this._friction
    this.angularDrag = options?.angularDrag ?? this._angularDrag

    this.transform = new Transform({
      observer: {
        _onUpdate: (transform) => this.shape.setTransform(transform.position, transform.rotation),
      },
    })
    this.transform.position.set(options?.position?.x, options?.position?.y)
    this.transform.rotation = options?.rotation ?? 0
  }

  applyForce(force: PointData, position: PointData) {
    // https://research.ncl.ac.uk/game/mastersdegree/gametechnologies/physicstutorials/3angularmotion/Physics%20-%20Angular%20Motion.pdf
    this.force.add(force, this.force)
    this.torque += this.transform.matrix.applyInverse(position).cross(force)
  }
}
