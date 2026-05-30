import { Rectangle, Renderer, Sprite } from 'pixi.js'
import { World, System, SignalMap, Signaler, Disconnectable, Component, View } from '.'
import { Camera, Collider, RigidBody } from './components'
import { CameraSystem, PhysicsSystem, TransformSystem } from './systems'
import { EMath } from './extras'

export abstract class Scene<S extends SignalMap> extends World implements View {
  protected systems = new Array<System<S>>()
  protected readonly connections = Array<Disconnectable>()

  private inputPad = new Sprite()
  private options!: Scene.Options
  private physicsOptions!: PhysicsSystem.Options
  private currentCameraId?: number
  private _camera?: View.CameraEntity

  constructor(
    protected renderer: Renderer,
    protected signaler: Signaler<S>,
  ) {
    super()

    this._createSystem(TransformSystem, 0)

    this.eventMode = 'static'
    this.addChild(this.inputPad)

    this.renderer.addListener(
      'resize',
      () => {
        this.resizeInputPad()
      },
      this,
    )
  }

  get bounds(): Rectangle {
    return this.options?.bounds ?? this.viewport
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

  abstract init(): Promise<void>
  async _init(options?: Partial<Scene.Options>): Promise<void> {
    this.options = { ...options }
    this.physicsOptions = { ...PhysicsSystem.defaultOptions(), ...options?.physics }

    this.resizeInputPad()

    await this.init()
  }

  async deinit?(): Promise<void>
  async _deinit() {
    await this.deinit?.()

    this.systems.forEach((s) => s.deinit?.())
    this.connections.forEach((c) => c.disconnect())

    this.renderer.removeListener('resize')

    this.destroy()
  }

  fixedUpdate?(dt: number): void
  _fixedUpdate(dt: number) {
    this.systems.forEach((s) => {
      s.fixedUpdate?.(dt)
    })
    this.fixedUpdate?.(dt)
  }

  update?(dt: number): void
  _update(dt: number) {
    this.systems.forEach((s) => {
      s.update?.(dt)
    })
    this.update?.(dt)
  }

  createEntity(tag?: string): number {
    const id = super.createEntity(tag)
    this.signaler.emit('entity-added', { id, tag })
    return id
  }

  removeEntity(id: number): boolean {
    const tag = this.getTag(id)
    const didRemove = super.removeEntity(id)
    if (didRemove) {
      if (this.currentCameraId === id) this.currentCameraId = undefined

      this.signaler?.emit('entity-removed', { id, tag })
    }
    return didRemove
  }

  addComponent<T extends Component>(component: T, entityId: number): T | undefined {
    const c = super.addComponent(component, entityId)
    if (c instanceof RigidBody) {
      const col = this.getComponent(Collider, entityId)
      if (col) c.resetShapeProperties(col, this.physicsOptions.ppm)

      this.createSystemIfNeeded(PhysicsSystem, -Infinity, (ps) => {
        ps.options = this.physicsOptions
      })
    } else if (c instanceof Collider) {
      this.getComponent(RigidBody, entityId)?.resetShapeProperties(c, this.physicsOptions.ppm)
    } else if (c instanceof Camera) {
      this.createSystemIfNeeded(CameraSystem, Infinity)
    }
    return c
  }

  createSystem<T extends System<S>>(constructor: System.Constructor<S, T>, priority = 1): T {
    switch (constructor.name) {
      case TransformSystem.name:
      case PhysicsSystem.name:
      case CameraSystem.name:
        throw new Error(`${constructor.name} will be created automatically if needed`)
    }
    const s = this._createSystem(constructor, EMath.clamp(priority, 1, 1000))
    s.init()
    return s
  }

  removeSystem<T extends System<S>>(typeValue: System.Constructor<S, T>): boolean {
    this.getSystem(typeValue)?.deinit?.()
    const i = this.systems.findIndex((s) => s instanceof typeValue)
    const didFind = i >= 0
    if (didFind) this.systems.splice(i)
    return didFind
  }

  private createSystemIfNeeded<T extends System<S>>(
    typeValue: System.Constructor<S, T>,
    priority: number,
    init?: (system: T) => void,
  ) {
    if (this.hasSystem(typeValue)) {
      return
    }
    const s = this._createSystem(typeValue, priority)
    init?.(s)
  }

  private _createSystem<T extends System<S>>(
    constructor: System.Constructor<S, T>,
    priority: number,
  ) {
    if (this.hasSystem(constructor)) {
      this.removeSystem(constructor)
    }
    const s = new constructor(this, this, this.signaler, priority)
    this.systems.push(s)
    this.systems.sort((a, b) => a.priority - b.priority)
    return s
  }

  private hasSystem<T extends System<S>>(typeValue: System.Constructor<S, T>): boolean {
    return this.systems.findIndex((s) => s instanceof typeValue) >= 0
  }

  private getSystem<T extends System<S>>(typeValue: System.Constructor<S, T>): T | undefined {
    return this.systems.find((s) => s instanceof typeValue) as T
  }

  private resizeInputPad() {
    this.inputPad.setSize(this.bounds)
  }
}

export namespace Scene {
  export type Constructor<S extends SignalMap> = new (
    renderer: Renderer,
    signaler: Signaler<S>,
  ) => Scene<S>

  export interface Options {
    bounds?: Rectangle
    physics?: Partial<PhysicsSystem.Options>
  }
}
