import { Point, PointData, Transform } from 'pixi.js'
import { Range, Vector, Component } from '../core'
import { Geometry } from '../geometry'
import { Collision, Colliders } from '../collision'

export abstract class Collider implements Component {
  layer: number
  readonly contacts = new Map<number, Collider.Contact>()

  abstract readonly _areaProperties: Geometry.AreaProperties
  readonly _vertices: Point[]
  readonly _transform: Transform
  readonly _aabb: Geometry.AABB = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  private shouldUpdateVertices = true

  protected constructor(
    protected readonly _localVertices: Point[],
    options?: Partial<Collider.Options>,
  ) {
    this._vertices = _localVertices.map((v) => v.clone())
    this._transform = new Transform({
      observer: {
        _onUpdate: (_) => {
          this.shouldUpdateVertices = true
        },
      },
    })
    this.layer = options?.layer ?? 0
  }

  get center(): Point {
    return this._transform.position.add(this.centroid)
  }
  protected get centroid(): Point {
    return this._areaProperties.centroid
  }

  updateVerticesIfNeeded() {
    if (this.shouldUpdateVertices) {
      this.updateVertices()
    }
    this.shouldUpdateVertices = false
  }

  canCollide(B: Collider, map?: Collision.LayerMap): boolean {
    return (
      !map || (((map.get(this.layer) ?? 0) & B.layer) | ((map.get(B.layer) ?? 0) & this.layer)) != 0
    )
  }

  hasAABBIntersection(B: Collider): boolean {
    this.updateVerticesIfNeeded()
    B.updateVerticesIfNeeded()

    return Geometry.isAABBIntersection(this._aabb, B._aabb)
  }

  findContact(B: Collider, includePoints: boolean = false): Collider.Contact | undefined {
    this.updateVerticesIfNeeded()
    B.updateVerticesIfNeeded()

    if (!this.hasAABBIntersection(B)) {
      return
    }

    let contact: Collider.Contact | undefined
    if (B instanceof Colliders.Circle) {
      contact = this.findContactWithCircle(B, includePoints)
    } else if (B instanceof Colliders.Polygon) {
      contact = this.findContactWithPolygon(B, includePoints)
    }

    return contact
  }

  // transformRay(localRay: Collision.Ray, out_ray?: Collision.Ray): Collision.Ray {
  //   out_ray ??= {
  //     origin: localRay.origin.clone(),
  //     target: localRay.target.clone(),
  //     collisionMask: localRay.collisionMask,
  //     intersects: localRay.intersects,
  //   }
  //   const matrix = this._transform.matrix
  //   matrix.apply(localRay.origin, out_ray.origin)
  //   matrix.apply(localRay.target, out_ray.target)
  //   out_ray.intersects = false

  //   return out_ray
  // }

  evaluateRayIntersection(ray: Collision.Ray) {
    ray.intersects = false

    if ((this.layer & ray.collisionMask) == 0) {
      return
    }

    const axis = new Vector()
    ray.target.subtract(ray.origin, axis).normalize(axis)

    ray.intersects =
      Geometry.hasProjectionOverlap(this.getProjectionRange(axis), {
        min: axis.dot(ray.origin),
        max: axis.dot(ray.target),
      }) &&
      Geometry.hasProjectionOverlap(
        this.getProjectionRange(axis.orthogonalize(axis)),
        Range.point(axis.dot(ray.origin)),
      )
  }

  abstract getProjectionRange(axis: Vector): Range

  abstract findContactWithCircle(
    B: Colliders.Circle,
    includePoints: boolean,
  ): Collider.Contact | undefined
  abstract findContactWithPolygon(
    B: Colliders.Polygon,
    includePoints: boolean,
  ): Collider.Contact | undefined

  protected updateVertices() {
    const matrix = this._transform.matrix
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (let i = 0; i < this._localVertices.length; i++) {
      const v = this._vertices[i]!
      matrix.apply(this._localVertices[i]!, v)

      minX = Math.min(minX, v.x)
      maxX = Math.max(maxX, v.x)
      minY = Math.min(minY, v.y)
      maxY = Math.max(maxY, v.y)
    }
    this._aabb.min.x = minX
    this._aabb.min.y = minY
    this._aabb.max.x = maxX
    this._aabb.max.y = maxY
  }

  protected correctContactDirectionIfNeeded(B: Collider, out_contact: Collider.Contact) {
    if (B.center.subtract(this.center).dot(out_contact.normal) < 0) {
      out_contact.normal.multiplyScalar(-1, out_contact.normal)
    }
  }
}

export namespace Collider {
  export interface Options {
    layer: number
    localOffset: PointData
  }

  export interface ContactPoint {
    point: Point
    depth: number
  }

  export interface Contact extends Geometry.ProjectionOverlap {
    points?: ContactPoint[]
  }

  export const circle = (radius: number, options?: Partial<Collider.Options>) => {
    return new Colliders.Circle(radius, options)
  }

  export const rectangle = (width: number, height: number, options?: Partial<Collider.Options>) => {
    const halfW = width / 2
    const halfH = height / 2

    return new Colliders.Polygon(
      [
        new Point(-halfW, -halfH),
        new Point(halfW, -halfH),
        new Point(halfW, halfH),
        new Point(-halfW, halfH),
      ],
      options,
    )
  }

  export const regularPolygon = (
    radius: number,
    sides: number,
    options?: Partial<Collider.Options>,
  ) => {
    return new Colliders.Polygon(
      Geometry.Polygon.createRegularPolygonVertices(radius, sides),
      options,
    )
  }

  export const polygon = (vertices: Point[], options?: Partial<Collider.Options>) => {
    return new Colliders.Polygon(vertices, options)
  }
}
