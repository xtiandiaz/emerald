import { Point, Transform } from 'pixi.js'
import { Shape, Circle, Rectangle, ConvexPolygon } from '../geometry'
import { ShapeOverlap, CollisionMap } from '../collision'
import { Vector } from '../types'

export class Collider {
  readonly overlaps = new Map<number, Collider.Overlap>()

  constructor(
    public _shape: Shape,
    public layer = 1,
  ) {}

  get _transform(): Transform {
    return this._shape._transform
  }

  canCollide(other: Collider, map?: CollisionMap): boolean {
    return (
      !map ||
      (((map.get(this.layer) ?? 0) & other.layer) | ((map.get(other.layer) ?? 0) & this.layer)) != 0
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
  export const circle = (radius: number, layer?: number) => {
    return new Collider(new Circle(radius), layer)
  }
  export const rectangle = (width: number, height: number, layer?: number) => {
    return new Collider(new Rectangle(width, height), layer)
  }
  export const regularPolygon = (radius: number, sides: number, layer?: number) => {
    return new Collider(ConvexPolygon.from(radius, sides), layer)
  }
  export const convexPolygon = (vertices: Point[], layer?: number) => {
    return new Collider(new ConvexPolygon(vertices), layer)
  }

  export interface Overlap {
    otherId: number
    otherTag?: string
    depth: number
    normal: Vector
  }
}
