import { Point, Transform } from 'pixi.js'
import { BoundingBox, isAABB, ProjectionRange } from '.'
import { VectorData } from '..'

export abstract class Shape {
  readonly _center = new Point()
  readonly _transform = new Transform({
    observer: { _onUpdate: () => (this.shouldUpdateVertices = true) },
  })

  abstract readonly _localCenter: Point

  protected readonly _bb: BoundingBox = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }

  private shouldUpdateVertices = true

  hasAABB(other: Shape): boolean {
    this.updateVerticesIfNeeded()
    other.updateVerticesIfNeeded()

    return isAABB(this._bb, other._bb)
  }

  abstract getProjectionRange(axis: VectorData): ProjectionRange

  protected updateVertices(): void {
    this._transform.position.add(this._localCenter, this._center)
  }

  protected updateVerticesIfNeeded() {
    if (this.shouldUpdateVertices) {
      this.updateVertices()
    }
    this.shouldUpdateVertices = false
  }
}
