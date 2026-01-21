import { ObservablePoint, Point, type PointData } from 'pixi.js'
import { clamp, Vector, VectorData } from '../core'
import 'pixi.js/math-extras'

declare global {
  interface Vector2Math {
    clamp<T extends PointData = Point>(min: PointData, max: PointData, out_vector?: T): T
    clampScalar<T extends PointData = Point>(min: number, max: number, out_vector?: T): T
    clampMagnitude<T extends PointData = Point>(maxMagnitude: number, out_vector?: T): T
    crossScalar<T extends PointData = Point>(scalar: number, out_vector?: T): T
    divideBy<T extends PointData = Point>(other: T, out_vector?: T): T
    divideByScalar<T extends PointData = Point>(scalar: number, out_vector?: T): T
    isNearlyEqual(other: PointData, minDistance?: number): boolean

    orthogonalize<T extends VectorData = Vector>(out_vector?: T): T
  }
}

Point.prototype.clamp = ObservablePoint.prototype.clamp = function <T extends PointData = Point>(
  this,
  min: PointData,
  max: PointData,
  out_point?: T,
): T {
  out_point ??= new Point() as PointData as T
  out_point.x = clamp(this.x, min.x, max.x)
  out_point.y = clamp(this.y, min.y, max.y)

  return out_point
}

Point.prototype.clampScalar = ObservablePoint.prototype.clampScalar = function <
  T extends PointData = Point,
>(this, min: number, max: number, out_point?: T): T {
  out_point ??= new Point() as PointData as T
  out_point.x = clamp(this.x, min, max)
  out_point.y = clamp(this.y, min, max)

  return out_point
}

Vector.prototype.clampMagnitude = function <T extends VectorData = Vector>(
  this,
  maxMagnitude: number,
  out_vector?: T,
): T {
  out_vector ??= new Vector() as VectorData as T
  const magnitude = this.magnitude()
  this.multiplyScalar(Math.min(magnitude, maxMagnitude) / magnitude, out_vector)

  return out_vector
}

Vector.prototype.crossScalar = function <T extends VectorData = Vector>(
  this,
  scalar: number,
  out_vector?: T,
) {
  out_vector ??= new Vector() as VectorData as T
  const x = this.x
  out_vector.x = -this.y * scalar
  out_vector.y = x * scalar

  return out_vector
}

Point.prototype.divideBy = ObservablePoint.prototype.divideBy = function <
  T extends PointData = Point,
>(this, other: T, out_vector?: T): T {
  out_vector ??= new Point() as PointData as T
  out_vector.x = this.x / other.x
  out_vector.y = this.y / other.y

  return out_vector
}

Point.prototype.divideByScalar = ObservablePoint.prototype.divideByScalar = function <
  T extends PointData = Point,
>(this, scalar: number, out_point?: T): T {
  return this.divideBy(new Point(scalar, scalar) as PointData as T, out_point)
}

Point.prototype.isNearlyEqual = ObservablePoint.prototype.isNearlyEqual = function (
  other: PointData,
  minDistance: number = 0.001,
): boolean {
  return this.subtract(other).magnitudeSquared() <= minDistance * minDistance
}

Vector.prototype.orthogonalize = function <T extends VectorData = Vector>(this, out_vector?: T): T {
  out_vector ??= new Vector() as VectorData as T
  const x = this.x
  out_vector.x = -this.y
  out_vector.y = x

  return out_vector
}
