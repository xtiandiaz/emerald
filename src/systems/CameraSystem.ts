import { Point } from 'pixi.js'
import { Camera } from '../components'
import { System, SignalMap } from '..'
import { EMath } from '../extras'

export class CameraSystem<S extends SignalMap> extends System<S> {
  private speed?: number
  private pos = { target: new Point(), focus: new Point() }
  private zoom = { next: 1, cur: 1 }
  private isFirstFocus = true

  init() {}

  update(dt: number): void {
    const c = this.view.camera
    if (!c) {
      return
    }
    this.focus(c[0], c[1])

    this.speed = c[0].speed
    if (this.isFirstFocus || this.speed === undefined) {
      this.zoom.cur = this.zoom.next
      this.view.position.copyFrom(this.pos.focus)
      this.isFirstFocus = false
    } else {
      const dd = dt * this.speed
      this.zoom.cur += (this.zoom.next - this.zoom.cur) * dd
      this.view.position.x += (this.pos.focus.x - this.view.position.x) * dd
      this.view.position.y += (this.pos.focus.y - this.view.position.y) * dd
    }
    this.view.scale.set(this.zoom.cur)
  }

  private focus(camera: Camera, entityId: number) {
    this.zoom.next = camera.zoom

    const target = this.getComponent(camera.target, entityId)
    if (!target) {
      return
    }
    target.position.multiplyByScalar(this.zoom.next, this.pos.target)

    const zbdW = this.bounds.width * this.zoom.next
    const zbdH = this.bounds.height * this.zoom.next

    this.pos.focus.x =
      zbdW < this.viewport.width
        ? (this.viewport.width - zbdW) * 0.5
        : EMath.clamp(
            -this.pos.target.x + this.viewport.width * 0.5,
            this.viewport.width - zbdW,
            0,
          ) + camera.offset.x
    this.pos.focus.y =
      zbdH < this.viewport.height
        ? (this.viewport.height - zbdH) * 0.5
        : EMath.clamp(
            -this.pos.target.y + this.viewport.height * 0.5,
            this.viewport.height - zbdH,
            0,
          ) - camera.offset.y
  }
}
