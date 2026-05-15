import { Point, Transform } from 'pixi.js'
import { Geometry } from '../../geometry'
import { Collision, CollisionMap } from '../../collision'
import type { Physics } from '../../physics'
import { Circle, Rectangle, Polygon, Shape } from '../../geometry/shapes'

export class Collider {
  readonly collisions = new Map<number, Collision.Instance>()

  constructor(
    private shape: Shape,
    public layer = 1,
  ) {}

  get _transform(): Transform {
    return this.shape._transform
  }
  // get _physicsProperties(): Physics.AreaProperties {
  //   return this.shape._areaProperties.physics
  // }

  canCollide(other: Collider, map?: CollisionMap): boolean {
    return (
      !map ||
      (((map.get(this.layer) ?? 0) & other.layer) | ((map.get(other.layer) ?? 0) & this.layer)) != 0
    )
  }

  hasAABB(other: Collider): boolean {
    return this.canCollide(other) && this.shape.hasAABB(other.shape)
  }

  findCollision(other: Collider, includePoints: boolean = false): Collision | undefined {
    if (!this.hasAABB(other)) {
      return
    }
    return this.shape.getOverlap(B.shape, includePoints)
  }
}

export namespace Collider {
  export interface Options {
    shape: Collision.Shape
    layer: number
  }

  export type Contact = Collision.Shape.Contact

  export const circle = (radius: number, layer?: number) => {
    return new Collider(new Circle(radius), layer)
  }
  export const rectangle = (width: number, height: number, layer?: number) => {
    return new Collider(new Rectangle(width, height), layer)
  }
  export const regularPolygon = (radius: number, sides: number, layer?: number) => {
    return new Collider(Polygon.from(radius, sides), layer)
  }
  export const polygon = (vertices: Point[], layer?: number) => {
    return new Collider(new Polygon(vertices), layer)
  }
}
