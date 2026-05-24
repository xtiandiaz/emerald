import { Container, Renderer, Sprite, Transform } from 'pixi.js'
import { World, System, Screen, SignalMap, Signaler, Disconnectable, Component } from '.'
import { Collider, RigidBody } from './components'
import { Debug } from './debug'
import { PhysicsSystem } from './systems'

export abstract class Scene<S extends SignalMap> extends World {
  protected readonly systems = new Map<string, System<S>>()
  protected readonly connections = Array<Disconnectable>()

  private inputPad = new Sprite()
  private options!: Scene.Options
  private physicsOptions!: PhysicsSystem.Options
  private debugDisplay?: Debug.Display

  constructor(
    protected renderer: Renderer,
    protected signaler: Signaler<S>,
  ) {
    super()

    // this.boundsArea = options?.bounds ?? new Rectangle(0, 0, Screen.width, Screen.height)

    // this.getLayer(Stage.Layer.UI).attach(this.inputPad)
    this.addChild(this.inputPad)

    this.renderer.addListener('resize', this.onResized)
  }

  async init?(): Promise<void>
  async _init(options?: Partial<Scene.Options>): Promise<void> {
    this.options = { ...options }
    this.physicsOptions = { ...options?.physics, ...PhysicsSystem.defaultOptions() }

    await this.init?.()

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
        // Only updating Containers here, to reflect the RigidBody's transform.
        // The Colliders are being fixed-updated accordingly by the PhysicsSystem
        for (const c of e.components.values().filter((c) => c instanceof Container)) {
          c.setFromMatrix(rb.matrix)
        }
      } else {
        t = e.components.get(Transform.name) as Transform
        if (!t) continue
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

  createEntity(tag?: string): number {
    const id = super.createEntity(tag)
    this.signaler.emit('entity-added', { id, tag })
    return id
  }

  removeEntity(id: number): boolean {
    const tag = this.getTag(id)
    const wasRemoved = super.removeEntity(id)
    if (wasRemoved) {
      this.signaler?.emit('entity-removed', { id, tag })
    }
    return wasRemoved
  }

  addComponent<T extends Component>(component: T, entityId: number): T | undefined {
    const c = super.addComponent(component, entityId)
    if (c instanceof RigidBody) {
      const col = this.getComponent(Collider, entityId)
      if (col) c.resetShapeProperties(col, this.physicsOptions.pixelsPerMeter)

      if (!this.systems.has(PhysicsSystem.name)) {
        const ps = this.createSystem(PhysicsSystem)
        ps._init(this.physicsOptions)
      }
    } else if (c instanceof Collider) {
      const rb = this.getComponent(RigidBody, entityId)
      if (rb) rb.resetShapeProperties(c, this.physicsOptions.pixelsPerMeter)
    }
    return c
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
    // bounds: Rectangle
    // debug: Debug.Options.Scene
    physics?: Partial<PhysicsSystem.Options>
  }
}
