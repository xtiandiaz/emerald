import { Point } from 'pixi.js'
import { Shape } from '.'
import { ProjectionRange } from '..'
import { VectorData } from '../..'

export class Circle extends Shape {
  constructor(readonly radius: number) {
    super()
  }

  get center(): Point {
    return this._transform.position
  }

  getProjectionRange(axis: VectorData): ProjectionRange {
    const dot = axis.x * this.center.x + axis.y * this.center.y
    const projs: [number, number] = [dot - this.radius, dot + this.radius]

    return projs[0] < projs[1] ? { min: projs[0], max: projs[1] } : { min: projs[1], max: projs[0] }
  }

  protected updateVertices(): void {
    const pos = this._transform.position,
      scale = this._transform.scale

    this._bb.min.x = pos.x - this.radius * scale.x
    this._bb.min.y = pos.y - this.radius * scale.y
    this._bb.max.x = pos.x + this.radius * scale.x
    this._bb.max.y = pos.y + this.radius * scale.y
  }
}
