import { Transform } from 'pixi.js'
import { BoundingBox, isAABB } from '../../../geometry'

export abstract class Shape {
  readonly _transform = new Transform({
    observer: { _onUpdate: () => (this.shouldUpdateVertices = true) },
  })
  protected readonly _bb: BoundingBox = { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } }
  private shouldUpdateVertices = true

  constructor() {}

  hasAABB(other: Shape): boolean {
    this.updateVerticesIfNeeded()
    other.updateVerticesIfNeeded()

    return isAABB(this._bb, other._bb)
  }

  protected updateVerticesIfNeeded() {
    if (this.shouldUpdateVertices) {
      this.updateVertices()
    }
    this.shouldUpdateVertices = false
  }

  protected abstract updateVertices(): void
}

export namespace Shape {}
