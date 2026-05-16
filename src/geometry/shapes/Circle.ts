import { Point } from 'pixi.js'
import { Shape } from '.'
import { ProjectionRange } from '..'
import { VectorData } from '../..'

export class Circle extends Shape {
  protected readonly __center = new Point()
  protected readonly _area: number

  constructor(private readonly _radius: number) {
    super()

    this._area = Math.PI * _radius * _radius
  }

  get radius(): number {
    return this._radius * this._transform.scale.x
  }

  getProjectionRange(axis: VectorData): ProjectionRange {
    const dot = axis.x * this._center.x + axis.y * this._center.y
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

  protected calculateAttributesIfNeeded(): void {
    if (this._center === undefined) {
      console.log('center is und')
    }
  }
}
