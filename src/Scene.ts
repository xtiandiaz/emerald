import { Container, Rectangle, Renderer, Sprite, Transform } from 'pixi.js'
import { World, System, Screen, SignalMap, Signaler, Disconnectable } from '.'
import { Collider, RigidBody } from './components'
import { Debug } from './debug'
import { PhysicsSystem } from './systems'

export abstract class Scene<S extends SignalMap> extends World {
  protected readonly systems = new Map<string, System<S>>()
  protected readonly connections = Array<Disconnectable>()

  private inputPad = new Sprite()
  // private rayCaster = new RayCaster(this._colliders)
  private debugDisplay?: Debug.Display

  constructor(
    protected renderer: Renderer,
    protected signaler: Signaler<S>,
  ) {
    // protected readonly options?: Partial<Scene.Options>,
    super()

    // this.boundsArea = options?.bounds ?? new Rectangle(0, 0, Screen.width, Screen.height)

    // this.getLayer(Stage.Layer.UI).attach(this.inputPad)
    this.addChild(this.inputPad)

    this.renderer.addListener('resize', this.onResized)
  }

  async init?(): Promise<void>
  async _init(): Promise<void> {
    await this.init?.()

    // this.initDebugIfNeeded(signals)

    this.systems.forEach((s) => s.init() ?? [])
  }

  async deinit?(): Promise<void>
  async _deinit() {
    await this.deinit?.()

    this.systems.forEach((s) => s.deinit?.())

    this.connections.forEach((c) => c.disconnect())

    this.renderer.removeListener('resize', this.onResized)

    // this.debugDisplay?.deinit()

    this.destroy()
  }

  fixedUpdate?(dt: number): void
  _fixedUpdate(dt: number) {
    this.systems.forEach((s) => {
      s.fixedUpdate?.(dt)
    })
  }

  update?(dt: number): void
  _update(dt: number) {
    let rb: RigidBody, t: Transform
    for (const e of this._entities.values()) {
      rb = e.components.get(RigidBody.name) as RigidBody
      if (rb) {
        // Only update Containers here; the Colliders are being fixed-updated by the PhysicsSystem
        for (const c of e.components.values().filter((c) => c instanceof Container)) {
          c.setFromMatrix(rb.matrix)
        }
      } else {
        t = e.components.get(Transform.name) as Transform
        if (!t) {
          continue
        }
        for (const c of e.components.values()) {
          if (c instanceof Container) {
            c.setFromMatrix(t.matrix)
          } else if (c instanceof Collider) {
            c._transform.setFromMatrix(t.matrix)
          }
        }
      }
    }

    this.systems.forEach((s) => {
      s.update?.(dt)
    })
  }

  createSystem<T extends System<S>>(constructor: System.Constructor<S, T>): T {
    this.removeSystem(constructor.name)
    const s = new constructor(this, this.renderer.screen, this.signaler)
    this.systems.set(constructor.name, s)

    return s
  }

  removeSystem(key: string): boolean {
    this.systems.get(key)?.deinit?.()
    return this.systems.delete(key)
  }

  private onResized() {
    this.inputPad.setSize(Screen.width, Screen.height)
  }

  // Debug ⬇️

  // initDebugIfNeeded(signals: Signals.Bus<S>) {
  //   if (!this.options?.debug) {
  //     return
  //   }
  //   this.debugDisplay = new Debug.Display(this.options.debug)
  //   this.getLayer(Stage.Layer.DEBUG).attach(this.debugDisplay)
  //   this.addChild(this.debugDisplay)

  //   this.debugDisplay.init(this, signals)
  // }

  // updateDebug(fps: number) {
  //   this.debugDisplay?.stats?.update(fps)
  // }
}

export namespace Scene {
  export type Constructor<S extends SignalMap> = new (
    renderer: Renderer,
    signaler: Signaler<S>,
  ) => Scene<S>

  export interface Options {
    bounds: Rectangle
    debug: Debug.Options.Scene
    physics?: PhysicsSystem.Options
  }
}
