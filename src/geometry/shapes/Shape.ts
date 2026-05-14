import { Point, Transform } from 'pixi.js'
import { BoundingBox, isAABB, ProjectionRange } from '..'
import { VectorData } from '../..'

export abstract class Shape {
  readonly _transform = new Transform({
    observer: { _onUpdate: () => (this.shouldUpdateVertices = true) },
  })
  protected readonly _bb: BoundingBox = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  private shouldUpdateVertices = true

  constructor() {}

  abstract get center(): Point

  hasAABB(other: Shape): boolean {
    this.updateVerticesIfNeeded()
    other.updateVerticesIfNeeded()

    return isAABB(this._bb, other._bb)
  }

  abstract getProjectionRange(axis: VectorData): ProjectionRange

  protected updateVerticesIfNeeded() {
    if (this.shouldUpdateVertices) {
      this.updateVertices()
    }
    this.shouldUpdateVertices = false
  }

  protected abstract updateVertices(): void
}
