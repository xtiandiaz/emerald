import { Point, Transform } from 'pixi.js'
import { type Component } from '../core'
import { Geometry } from '../geometry'
import { Collision } from '../collision'
import type { Physics } from '../physics'

export class Collider implements Component {
  layer: number
  readonly collisions = new Map<number, Collision.Instance>()

  get _transform(): Transform {
    return this.shape._transform
  }
  get _physicsProperties(): Physics.AreaProperties {
    return this.shape._areaProperties.physics
  }

  constructor(
    public shape: Collision.Shape,
    options?: Partial<Collider.Options>,
  ) {
    this.layer = options?.layer ?? 1
  }

  canCollide(B: Collider, map?: Collision.LayerMap): boolean {
    return (
      !map || (((map.get(this.layer) ?? 0) & B.layer) | ((map.get(B.layer) ?? 0) & this.layer)) != 0
    )
  }

  hasAABBIntersection(B: Collider): boolean {
    return this.shape.hasAABBIntersection(B.shape)
  }

  findContact(B: Collider, includePoints: boolean = false): Collision.Shape.Contact | undefined {
    return this.shape.findContact(B.shape, includePoints)
  }

  evaluateRayIntersection(ray: Collision.Ray) {
    this.shape.evaluateRayIntersection(ray)
  }
}

export namespace Collider {
  export interface Options extends Collision.Shape.Options {
    layer: number
  }

  export type Contact = Collision.Shape.Contact

  export const circle = (radius: number, options?: Partial<Collider.Options>) => {
    return new Collider(new Collision.Shape.Circle(radius, options), options)
  }

  export const rectangle = (width: number, height: number, options?: Partial<Collider.Options>) => {
    const halfW = width / 2
    const halfH = height / 2

    return new Collider(
      new Collision.Shape.Polygon(
        [
          new Point(-halfW, -halfH),
          new Point(halfW, -halfH),
          new Point(halfW, halfH),
          new Point(-halfW, halfH),
        ],
        options,
      ),
      options,
    )
  }

  export const regularPolygon = (
    radius: number,
    sides: number,
    options?: Partial<Collider.Options>,
  ) => {
    return new Collider(
      new Collision.Shape.Polygon(
        Geometry.Polygon.createRegularPolygonVertices(radius, sides),
        options,
      ),
      options,
    )
  }

  export const polygon = (vertices: Point[], options?: Partial<Collider.Options>) => {
    return new Collider(new Collision.Shape.Polygon(vertices, options), options)
  }
}
