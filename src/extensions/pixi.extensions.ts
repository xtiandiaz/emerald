import { Point, Rectangle, type PointData } from 'pixi.js'
import { clamp, Vector } from '../core'
import 'pixi.js/math-extras'

declare module 'pixi.js' {
  interface Rectangle {
    size(): Point
    center(): Point
  }
}

Rectangle.prototype.size = function (this): Point {
  return new Point(this.width, this.height)
}
Rectangle.prototype.center = function (this): Point {
  return new Point(this.x + this.width / 2, this.y + this.height / 2)
}

declare global {
  interface Vector2Math {
    clamp<T extends PointData = Point>(min: PointData, max: PointData, outVector?: T): T
    clampScalar<T extends PointData = Point>(min: number, max: number, outVector?: T): T
    crossScalar<T extends PointData = Vector>(scalar: number, outVector?: T): T
    divideBy<T extends PointData = Point>(other: T, outVector?: T): T
    divideByScalar<T extends PointData = Point>(scalar: number, outVector?: T): T
    isNearlyEqual(to: PointData, minDistance?: number): boolean
    orthogonalize<T extends PointData = Vector>(outVector?: T): T
  }
}

Point.prototype.clamp = function <T extends PointData = Point>(
  this,
  min: PointData,
  max: PointData,
  out_vector?: T,
): T {
  out_vector ??= new Point() as PointData as T
  out_vector.x = clamp(this.x, min.x, max.x)
  out_vector.y = clamp(this.y, min.y, max.y)

  return out_vector
}

Point.prototype.clampScalar = function <T extends PointData = Point>(
  this,
  min: number,
  max: number,
  out_vector?: T,
): T {
  out_vector ??= new Point() as PointData as T
  out_vector.x = clamp(this.x, min, max)
  out_vector.y = clamp(this.y, min, max)

  return out_vector
}

Vector.prototype.crossScalar = function <T extends PointData = Vector>(
  this,
  scalar: number,
  out_vector?: T,
) {
  out_vector ??= new Point() as PointData as T
  const x = this.x
  out_vector.x = -this.y * scalar
  out_vector.y = x * scalar

  return out_vector
}

Point.prototype.divideBy = function <T extends PointData = Point>(
  this,
  other: T,
  out_vector?: T,
): T {
  out_vector ??= new Point() as PointData as T
  out_vector.x = this.x / other.x
  out_vector.y = this.y / other.y

  return out_vector
}

Point.prototype.divideByScalar = function <T extends PointData = Point>(
  this,
  scalar: number,
  out_vector?: T,
): T {
  return this.divideBy(new Point(scalar, scalar) as PointData as T, out_vector)
}

Point.prototype.isNearlyEqual = function (to: PointData, minDistance: number = 0.001): boolean {
  return this.subtract(to).magnitudeSquared() <= minDistance * minDistance
}

Vector.prototype.orthogonalize = function <T extends PointData = Vector>(this, out_vector?: T): T {
  out_vector ??= new Point() as PointData as T
  const x = this.x
  out_vector.x = -this.y
  out_vector.y = x

  return out_vector
}
