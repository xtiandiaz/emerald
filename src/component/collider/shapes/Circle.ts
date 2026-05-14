import { Shape } from '.'

export class Circle extends Shape {
  constructor(readonly radius: number) {
    super()
  }

  protected updateVertices(): void {
    this._bb.min.x = this._transform.position.x - this.radius
    this._bb.min.y = this._transform.position.y - this.radius
    this._bb.max.x = this._transform.position.x + this.radius
    this._bb.max.y = this._transform.position.y + this.radius
  }
}
