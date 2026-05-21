import { Point } from 'pixi.js'
import { Shape, ProjectionRange } from '..'
import { VectorData } from '../..'

export class Circle extends Shape {
  readonly localCenter = new Point()

  constructor(private readonly _radius: number) {
    super()
  }

  get radius(): number {
    return this._radius * this._transform.scale.x
  }

  getProjectionRange(axis: VectorData): ProjectionRange {
    const dot = axis.x * this.center.x + axis.y * this.center.y
    const projs: [number, number] = [dot - this.radius, dot + this.radius]

    return projs[0] < projs[1] ? { min: projs[0], max: projs[1] } : { min: projs[1], max: projs[0] }
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
