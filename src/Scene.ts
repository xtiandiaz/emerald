import { Container, Rectangle, Renderer, Sprite, Transform } from 'pixi.js'
import { World, System, Screen, SignalMap, Signaler, Disconnectable, Component, View } from '.'
import { Camera, Collider, RigidBody } from './components'
import { CameraSystem, PhysicsSystem } from './systems'

export abstract class Scene<S extends SignalMap> extends World implements View {
  protected readonly systems = new Map<string, System<S>>()
  protected readonly connections = Array<Disconnectable>()

  private inputPad = new Sprite()
  private physicsOptions!: PhysicsSystem.Options
  private currentCameraId?: number
  private _camera?: View.CameraEntity

  constructor(
    protected renderer: Renderer,
    protected signaler: Signaler<S>,
  ) {
    super()

    this.addChild(this.inputPad)

    this.renderer.addListener('resize', this.onResized)
  }

  get viewport(): Rectangle {
    return this.renderer.screen
  }

  get camera(): View.CameraEntity | undefined {
    return this._camera
  }

  setCamera(entityId: number): Camera | undefined {
    if (!this.hasComponent(Camera, entityId)) {
      console.warn(`Undefined Camera at entity ${entityId}`)
      return
    }
    const c = this.getComponent(Camera, entityId)!
    this._camera = [c, entityId]
    return c
  }

  async init?(): Promise<void>
  async _init(options?: Partial<Scene.Options>): Promise<void> {
    // this.options = { ...options }
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
      if (this.currentCameraId === id) this.currentCameraId = undefined

      this.signaler?.emit('entity-removed', { id, tag })
    }
    return wasRemoved
  }

  addComponent<T extends Component>(component: T, entityId: number): T | undefined {
    const c = super.addComponent(component, entityId)
    if (c instanceof RigidBody) {
      const col = this.getComponent(Collider, entityId)
      if (col) c.resetShapeProperties(col, this.physicsOptions.pixelsPerMeter)

      this.addSystemIfNeeded(PhysicsSystem, (ps) => {
        ps._init(this.physicsOptions)
      })
    } else if (c instanceof Collider) {
      const rb = this.getComponent(RigidBody, entityId)
      if (rb) rb.resetShapeProperties(c, this.physicsOptions.pixelsPerMeter)
    } else if (c instanceof Camera) {
      this.addSystemIfNeeded(CameraSystem)
    }
    return c
  }

  createSystem<T extends System<S>>(constructor: System.Constructor<S, T>): T {
    this.removeSystem(constructor.name)
    const s = new constructor(this, this, this.signaler)
    this.systems.set(constructor.name, s)
    return s
  }

  removeSystem(key: string): boolean {
    this.systems.get(key)?.deinit?.()
    return this.systems.delete(key)
  }

  private addSystemIfNeeded<T extends System<S>>(
    typeValue: System.Constructor<S, T>,
    config?: (system: T) => void,
  ) {
    if (!this.systems.has(typeValue.name)) {
      const s = this.createSystem(typeValue)
      config?.(s)
    }
  }

  private onResized() {
    this.inputPad.setSize(Screen.width, Screen.height)
  }
}

export namespace Scene {
  export type Constructor<S extends SignalMap> = new (
    renderer: Renderer,
    signaler: Signaler<S>,
  ) => Scene<S>

  export interface Options {
    physics?: Partial<PhysicsSystem.Options>
  }
}
