import { Point, Transform } from 'pixi.js'
import { Shape, Circle, Rectangle, ConvexPolygon } from '../geometry'
import { ShapeOverlap, CollisionMap } from '../collision'
import { Vector } from '../types'

export class Collider {
  readonly overlaps = new Map<number, Collider.Overlap>()
  layer: number

  constructor(
    public _shape: Shape,
    public options?: Collider.Options,
  ) {
    this.layer = options?.layer ?? 1
  }

  get _transform(): Transform {
    return this._shape._transform
  }

  canCollide(other: Collider, map?: CollisionMap): boolean {
    return (
      !map ||
      (((map.get(this.options) ?? 0) & other.options) |
        ((map.get(other.options) ?? 0) & this.options)) !=
        0
    )
  }

  hasAABB(other: Collider): boolean {
    return this.canCollide(other) && this._shape.hasAABB(other._shape)
  }

  hasOverlap(other: Collider, out_sp?: ShapeOverlap): boolean {
    return ShapeOverlap._from(this._shape, other._shape, out_sp).hasOverlap
  }
}

export namespace Collider {
  export interface Options {
    layer: number
  }

  export const circle = (radius: number, options?: Options) => {
    return new Collider(new Circle(radius), options)
  }
  export const rectangle = (width: number, height: number, options?: Options) => {
    return new Collider(new Rectangle(width, height), options)
  }
  export const regularPolygon = (radius: number, sides: number, options?: Options) => {
    return new Collider(ConvexPolygon.from(radius, sides), options)
  }
  export const convexPolygon = (vertices: Point[], options?: Options) => {
    return new Collider(new ConvexPolygon(vertices), options)
  }

  export interface Overlap {
    otherId: number
    otherTag?: string
    depth: number
    normal: Vector
  }
}
