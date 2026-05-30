import { Point } from 'pixi.js'
import { Shape, ProjectionRange } from '..'
import { VectorData } from '../..'
import { EMath } from '../../extras'

export class Circle extends Shape {
  constructor(private readonly _radius: number) {
    super(new Point())
  }

  get radius(): number {
    return this._radius * this._transform.scale.x
  }

  getProjectionRange(axis: VectorData, out_projRange?: ProjectionRange): ProjectionRange {
    out_projRange ??= { min: -Infinity, max: Infinity }
    const dot = EMath.dot(axis, this._center)
    const proj0 = dot - this.radius
    const proj1 = dot + this.radius
    out_projRange.min = Math.min(proj0, proj1)
    out_projRange.max = Math.max(proj0, proj1)

    return out_projRange
  }

  protected updateVertices(): void {
    super.updateVertices()

    const pos = this._transform.position

    this._bb.min.x = pos.x - this.radius
    this._bb.min.y = pos.y - this.radius
    this._bb.max.x = pos.x + this.radius
    this._bb.max.y = pos.y + this.radius
  }
}
