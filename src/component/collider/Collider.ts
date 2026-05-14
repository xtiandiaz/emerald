import { Point, Transform } from 'pixi.js'
import { Geometry } from '../../geometry'
import { Collision, CollisionMap } from '../../collision'
import type { Physics } from '../../physics'
import { Circle, Shape } from './shapes'

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

  // findContact(B: Collider, includePoints: boolean = false): Collision.Shape.Contact | undefined {
  //   return this.shape.findContact(B.shape, includePoints)
  // }

  // evaluateRayIntersection(ray: Collision.Ray) {
  //   this.shape.evaluateRayIntersection(ray)
  // }
}

export namespace Collider {
  export interface Options {
    shape: Collision.Shape
    layer: number
  }

  export type Contact = Collision.Shape.Contact

  export const circle = (radius: number) => {
    return new Collider(new Circle(radius))
  }

  // export const rectangle = (width: number, height: number, options?: Partial<Collider.Options>) => {
  //   const halfW = width / 2
  //   const halfH = height / 2

  //   return new Collider(
  //     new Collision.Shape.Polygon(
  //       [
  //         new Point(-halfW, -halfH),
  //         new Point(halfW, -halfH),
  //         new Point(halfW, halfH),
  //         new Point(-halfW, halfH),
  //       ],
  //       options,
  //     ),
  //   )
  // }

  // export const regularPolygon = (
  //   radius: number,
  //   sides: number,
  //   options?: Partial<Collider.Options>,
  // ) => {
  //   return new Collider(
  //     new Collision.Shape.Polygon(
  //       Geometry.Polygon.createRegularPolygonVertices(radius, sides),
  //       options,
  //     ),
  //     options,
  //   )
  // }

  // export const polygon = (vertices: Point[], options?: Partial<Collider.Options>) => {
  //   return new Collider(new Collision.Shape.Polygon(vertices, options), options)
  // }
}
