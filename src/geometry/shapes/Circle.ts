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
    this._bb.min.x = this._transform.position.x - this.radius
    this._bb.min.y = this._transform.position.y - this.radius
    this._bb.max.x = this._transform.position.x + this.radius
    this._bb.max.y = this._transform.position.y + this.radius
  }
}
