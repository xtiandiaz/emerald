import { ContainerChild, ContainerEvents, Sprite } from 'pixi.js'
import { Entity, EntityConstructor, Stage, System, type Disconnectable } from '../core'
import { Components } from '../components'
import { Signals } from '../signals'
import { Input } from '../input'
import { Debug } from '../debug'

export class Scene<C extends Components, S extends Signals>
  extends Stage<C>
  implements Input.Provider
{
  protected connections: Disconnectable[] = []

  private signals?: Signals.Bus<S>
  private inputPad = new Sprite()
  private debugDisplay?: Debug.Display

  constructor(
    public readonly label: string,
    protected readonly systems: System<C, S>[],
    protected readonly options?: Partial<Scene.Options>,
  ) {
    super()

    this.inputPad.eventMode = 'static'
    this.getLayer(Stage.Layer.UI).attach(this.inputPad)
    this.addChild(this.inputPad)
  }

  async load?(): Promise<void>

  build?(stage: Stage<C>): void

  connect?(signals: Signals.Bus<S>, input: Input.Provider): Disconnectable[]

  async init(signals: Signals.Bus<S>): Promise<void> {
    this.signals = signals

    await this.load?.()

    this.initDebugIfNeeded(signals)

    this.build?.(this)

    this.connect?.(signals, this)

    this.systems.forEach((s) => this.connections.push(...(s._init?.(this, signals, this) ?? [])))

    this.connections.push(
      signals.connect('screen-resized', (s) => {
        this.inputPad.width = s.width
        this.inputPad.height = s.height
      }),
    )
  }

  deinit(): void {
    this.debugDisplay?.deinit()

    this.connections.forEach((c) => c.disconnect())
  }

  fixedUpdate(signalBus: Signals.Bus<S>, dT: number) {
    this.systems.forEach((s) => {
      s.fixedUpdate?.(this, signalBus, dT)
    })
  }

  update(signalBus: Signals.Bus<S>, dT: number) {
    this.systems.forEach((s) => {
      s.update?.(this, signalBus, dT)
    })
  }

  connectDocumentEvent<T extends keyof DocumentEventMap>(
    type: T,
    connector: Input.DocumentEventConnector<T>,
  ): Disconnectable {
    return Input.connectDocumentEvent(type, connector)
  }

  connectContainerEvent<T extends keyof ContainerEvents<ContainerChild>>(
    type: T,
    connector: Input.ContainerEventConnector<T>,
  ): Disconnectable {
    return Input.connectContainerEvent(type, this.inputPad, connector)
  }

  createEntity<T extends Entity<C>>(type: EntityConstructor<C, T>): T {
    const entity = super.createEntity(type)

    this.signals?.emit('entity-added', { addedId: entity.id })

    return entity
  }

  removeEntity(id: number): boolean {
    const tag = this.getEntityTag(id)
    const isRemoved = super.removeEntity(id)
    if (isRemoved) {
      this.signals?.emit('entity-removed', { removedId: id, tag })
    }

    return isRemoved
  }

  // Debug ⬇️

  initDebugIfNeeded(signals: Signals.Bus<S>) {
    if (!this.options?.debug) {
      return
    }
    this.debugDisplay = new Debug.Display(this.options.debug)
    this.getLayer(Stage.Layer.DEBUG).attach(this.debugDisplay)
    this.addChild(this.debugDisplay)

    this.debugDisplay.init(this, signals)
  }

  updateDebug(fps: number) {
    this.debugDisplay?.stats?.update(fps)
  }
}

export namespace Scene {
  export interface Options {
    debug: Debug.Options.Scene
  }
}
