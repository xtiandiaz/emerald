import { Point, Transform } from 'pixi.js'
import { BoundingBox, isAABB, ProjectionRange } from '..'
import { VectorData } from '../..'

export abstract class Shape {
  readonly _center = new Point()
  readonly _transform = new Transform({
    observer: { _onUpdate: () => (this.shouldUpdateVertices = true) },
  })

  protected abstract readonly __center: Point
  protected abstract readonly _area: number
  protected readonly _bb: BoundingBox = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }

  private shouldUpdateVertices = true

  get area(): number {
    return this._area * this._transform.scale.x * this._transform.scale.y
  }

  hasAABB(other: Shape): boolean {
    this.updateVerticesIfNeeded()
    other.updateVerticesIfNeeded()

    return isAABB(this._bb, other._bb)
  }

  abstract getProjectionRange(axis: VectorData): ProjectionRange

  protected updateVertices(): void {
    this._transform.position.add(this.__center, this._center)
  }

  protected updateVerticesIfNeeded() {
    if (this.shouldUpdateVertices) {
      this.updateVertices()
    }
    this.shouldUpdateVertices = false
  }
}
