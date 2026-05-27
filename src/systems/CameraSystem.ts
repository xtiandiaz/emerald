import { Point } from 'pixi.js'
import { Camera } from '../components'
import { System, SignalMap } from '..'
import { EMath } from '../extras'

export class CameraSystem<S extends SignalMap> extends System<S> {
  private speed?: number
  private pos = { target: new Point(), focus: new Point() }
  private zoom = { next: 1, cur: 1 }

  init() {}

  update(dt: number): void {
    if (!this.focus()) {
      return
    }
    if (this.speed !== undefined) {
      const dd = dt * this.speed
      this.zoom.cur += (this.zoom.next - this.zoom.cur) * dd
      this.view.scale.set(this.zoom.cur)
      this.view.position.x += (this.pos.focus.x - this.view.position.x) * dd
      this.view.position.y += (this.pos.focus.y - this.view.position.y) * dd
    } else {
      this.view.position.copyFrom(this.pos.focus)
      this.view.scale.set(this.zoom.next)
    }
  }

  focus(): boolean {
    const c = this.view.camera
    if (!c) return false
    const t = this.getComponent(c[0].target, c[1])
    if (!t) return false
    this._focus(c[0], t.position)
    return true
  }

  private _focus(camera: Camera, targetPos: Point) {
    this.speed = camera.speed
    this.zoom.next = camera.zoom

    targetPos.multiplyByScalar(this.zoom.next, this.pos.target)
    this.pos.target.subtract(camera.offset, this.pos.target)

    // const zvpW = this.viewport.width * this.zoom.next
    // const zvpH = this.viewport.height * this.zoom.next
    const vpHalfW = this.viewport.width * 0.5
    const vpHalfH = this.viewport.height * 0.5

    this.pos.focus.x = -this.pos.target.x + vpHalfW
    // zvpW < this.viewport.width
    //   ? (this.viewport.width - zvpW) * 0.5
    // : EMath.clamp(-this.pos.target.x + vpHalfW, -zvpW + this.viewport.width, 0) + camera.offset.x
    this.pos.focus.y = -this.pos.target.y + vpHalfH
    // zvpH < this.viewport.height
    //   ? (this.viewport.height - zvpH) * 0.5
    // : EMath.clamp(-this.pos.target.y + vpHalfH, -zvpH + this.viewport.height, 0) + camera.offset.y
  }
}
