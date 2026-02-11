import { type ContainerChild, type ContainerEvents, Sprite } from 'pixi.js'
import { type EntityConstructor, Entity, Stage, System, Screen, type Disconnectable } from '../core'
import type { Components } from '../components'
import type { Signals } from '../signals'
import { Debug } from '../debug'
import { RayCaster } from '../collision/RayCaster'
import { Input } from '../input'

export abstract class Scene<
    C extends Components,
    S extends Signals,
    A extends Record<keyof A, string>,
  >
  extends Stage<C>
  implements Input.Provider
{
  protected connections: Disconnectable[] = []

  private inputPad = new Sprite()
  private rayCaster = new RayCaster(this._colliders)
  private signals?: Signals.Bus<S>
  private debugDisplay?: Debug.Display

  constructor(
    protected readonly systems: System<C, S, A>[],
    protected readonly options?: Partial<Scene.Options>,
  ) {
    super()

    this.inputPad.eventMode = 'static'
    this.getLayer(Stage.Layer.UI).attach(this.inputPad)
    this.addChild(this.inputPad)
  }

  async load?(): Promise<void>

  abstract build(): void

  connect?(signals: Signals.Bus<S>, input: Input.Provider): Disconnectable[]

  async init(signals: Signals.Bus<S>): Promise<void> {
    this.signals = signals

    await this.load?.()

    this.initDebugIfNeeded(signals)

    this.build?.()

    const toolkit: System.InitToolkit<S> = {
      input: this,
      signals,
    }
    this.systems.forEach((s) => s._init(this, toolkit) ?? [])

    this.connections.push(
      ...(this.connect?.(signals, this) ?? []),
      signals.connect('screen-resized', () => this.onResized()),
    )
    this.onResized()
  }

  deinit(): void {
    super.deinit()

    this.debugDisplay?.deinit()

    this.systems.forEach((s) => s.deinit())

    this.connections.forEach((c) => c.disconnect())
    this.connections.length = 0
  }

  fixedUpdate(signals: Signals.Bus<S>, dT: number) {
    this.systems.forEach((s) => {
      s.fixedUpdate?.(this, { rayCaster: this.rayCaster, signals }, dT)
    })
  }

  update(signals: Signals.Bus<S>, dT: number) {
    this.systems.forEach((s) => {
      s.update?.(this, { rayCaster: this.rayCaster, signals }, dT)
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

  private onResized() {
    this.inputPad.setSize(Screen.width, Screen.height)
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
