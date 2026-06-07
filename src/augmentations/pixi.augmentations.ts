import { ObservablePoint, Point, PointData } from 'pixi.js'
import { EMath } from '../extras'

declare global {
  interface Vector2Math {
    magnitudeSquared(): number
    magnitude(): number

    add<T extends PointData = Point>(other: PointData, out_point?: T): T
    addScalar<T extends PointData = Point>(scalar: number, out_point?: T): T
    addScalars<T extends PointData = Point>(x: number, y: number, out_point?: T): T
    subtract<T extends PointData = Point>(other: PointData, out_point?: T): T
    subtractScalar<T extends PointData = Point>(scalar: number, out_point?: T): T
    subtractScalars<T extends PointData = Point>(x: number, y: number, out_point?: T): T
    multiplyBy<T extends PointData = Point>(other: PointData, out_point?: T): T
    multiplyByScalar<T extends PointData = Point>(scalar: number, out_point?: T): T
    divideBy<T extends PointData = Point>(other: PointData, out_point?: T): T
    divideByScalar<T extends PointData = Point>(scalar: number, out_point?: T): T

    dot(other: PointData): number
    cross(other: PointData): number

    clamp<T extends PointData = Point>(min: PointData, max: PointData, out_vector?: T): T
    clampByScalar<T extends PointData = Point>(min: number, max: number, out_vector?: T): T
    clampByMagnitude<T extends PointData = Point>(maxMagnitude: number, out_vector?: T): T

    normalize<T extends PointData = Point>(out_vector?: T): T
    orthogonalize<T extends PointData = Point>(out_vector?: T): T
  }
}

Point.prototype.magnitudeSquared = ObservablePoint.prototype.magnitudeSquared = function (
  this,
): number {
  return this.x * this.x + this.y * this.y
}

Point.prototype.magnitude = ObservablePoint.prototype.magnitude = function (this): number {
  return Math.sqrt(this.magnitudeSquared())
}

Point.prototype.add = ObservablePoint.prototype.add = function <T extends PointData>(
  this,
  other: PointData,
  out_point?: T,
): T {
  out_point ??= new Point() as PointData as T
  out_point.x = this.x + other.x
  out_point.y = this.y + other.y
  return out_point
}

Point.prototype.addScalar = ObservablePoint.prototype.addScalar = function <T extends PointData>(
  this,
  scalar: number,
  out_point?: T,
): T {
  return this.addScalars(scalar, scalar, out_point)
}

Point.prototype.addScalars = ObservablePoint.prototype.addScalars = function <T extends PointData>(
  this,
  x: number,
  y: number,
  out_point?: T,
): T {
  out_point ??= new Point() as PointData as T
  out_point.x = this.x + x
  out_point.y = this.y + y
  return out_point
}

Point.prototype.subtract = ObservablePoint.prototype.subtract = function <T extends PointData>(
  this,
  other: PointData,
  out_point?: T,
): T {
  out_point ??= new Point() as PointData as T
  out_point.x = this.x - other.x
  out_point.y = this.y - other.y
  return out_point
}

Point.prototype.subtractScalar = ObservablePoint.prototype.subtractScalar = function <
  T extends PointData,
>(this, scalar: number, out_point?: T): T {
  return this.subtractScalars(scalar, scalar, out_point)
}

Point.prototype.subtractScalars = ObservablePoint.prototype.subtractScalars = function <
  T extends PointData,
>(this, x: number, y: number, out_point?: T): T {
  out_point ??= new Point() as PointData as T
  out_point.x = this.x - x
  out_point.y = this.y - y
  return out_point
}

Point.prototype.multiplyBy = ObservablePoint.prototype.multiplyBy = function <T extends PointData>(
  this,
  other: PointData,
  out_point?: T,
): T {
  out_point ??= new Point() as PointData as T
  out_point.x = this.x * other.x
  out_point.y = this.y * other.y
  return out_point
}

Point.prototype.multiplyByScalar = ObservablePoint.prototype.multiplyByScalar = function <
  T extends PointData,
>(this, scalar: number, out_point?: T): T {
  out_point ??= new Point() as PointData as T
  out_point.x = this.x * scalar
  out_point.y = this.y * scalar
  return out_point
}

Point.prototype.divideBy = ObservablePoint.prototype.divideBy = function <T extends PointData>(
  this,
  other: PointData,
  out_point?: T,
): T {
  out_point ??= new Point() as PointData as T
  out_point.x = this.x / other.x
  out_point.y = this.y / other.y
  return out_point
}

Point.prototype.divideByScalar = ObservablePoint.prototype.divideByScalar = function <
  T extends PointData,
>(this, scalar: number, out_point?: T): T {
  out_point ??= new Point() as PointData as T
  out_point.x = this.x / scalar
  out_point.y = this.y / scalar
  return out_point
}

Point.prototype.dot = ObservablePoint.prototype.dot = function (this, other: PointData): number {
  return this.x * other.x + this.y * other.y
}

Point.prototype.cross = ObservablePoint.prototype.cross = function (
  this,
  other: PointData,
): number {
  return this.x * other.y - this.y * other.x
}

Point.prototype.clamp = ObservablePoint.prototype.clamp = function <T extends PointData>(
  this,
  min: PointData,
  max: PointData,
  out_point?: T,
): T {
  out_point ??= new Point() as PointData as T
  out_point.x = EMath.clamp(this.x, min.x, max.x)
  out_point.y = EMath.clamp(this.y, min.y, max.y)
  return out_point
}

Point.prototype.clampByScalar = ObservablePoint.prototype.clampByScalar = function <
  T extends PointData = Point,
>(this, min: number, max: number, out_point?: T): T {
  out_point ??= new Point() as PointData as T
  out_point.x = EMath.clamp(this.x, min, max)
  out_point.y = EMath.clamp(this.y, min, max)
  return out_point
}

Point.prototype.clampByMagnitude = function <T extends PointData = Point>(
  this,
  maxMagnitude: number,
  out_vector?: T,
): T {
  out_vector ??= new Point() as PointData as T
  const magnitude = this.magnitude()
  this.multiplyScalar(Math.min(magnitude, maxMagnitude) / magnitude, out_vector)
  return out_vector
}

Point.prototype.normalize = ObservablePoint.prototype.normalize = function <T extends PointData>(
  this,
  out_vector?: T,
): T {
  out_vector ??= new Point() as PointData as T
  const mag = this.magnitude()
  if (mag === 0) {
    out_vector.x = 0
    out_vector.y = 0
  } else {
    out_vector.x = this.x / mag
    out_vector.y = this.y / mag
  }
  return out_vector
}

Point.prototype.orthogonalize = function <T extends PointData>(this, out_vector?: T): T {
  out_vector ??= new Point() as PointData as T
  const x = this.x
  out_vector.x = -this.y
  out_vector.y = x
  return out_vector
}
