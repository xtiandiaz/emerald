import { ContainerChild, ContainerEvents, RenderLayer, Sprite, Ticker } from 'pixi.js'
import { Stage, System, type Disconnectable } from '../core'
import { Components } from '../components'
import { Signals } from '../signals'
import { Input } from '../input'
import { Debug } from '../debug'

export class Scene<Cs extends Components, Ss extends Signals>
  extends Stage<Cs>
  implements Input.Provider
{
  protected connections: Disconnectable[] = []
  private inputPad = new Sprite()
  private debugDisplay?: Debug.Display

  constructor(
    public readonly label: string,
    protected readonly systems: System<Cs, Ss>[],
    protected readonly options?: Partial<Scene.Options>,
  ) {
    super()

    this.inputPad.eventMode = 'static'
    this.getLayer(Stage.Layer.UI).attach(this.inputPad)
    this.addChild(this.inputPad)
  }

  async load?(): Promise<void>

  build?(stage: Stage<Cs>): void

  connect?(signals: Signals.Bus<Ss>, input: Input.Provider): Disconnectable[]

  async init(signals: Signals.Bus<Ss>): Promise<void> {
    this.initDebugIfNeeded(signals)

    await this.load?.()

    this.build?.(this)

    this.connect?.(signals, this)

    this.systems.forEach((s) => this.connections.push(...(s.init?.(this, signals, this) ?? [])))

    signals.connect('screen-resized', (s) => {
      this.inputPad.width = s.width
      this.inputPad.height = s.height
    })
  }

  deinit(): void {
    this.debugDisplay?.deinit()

    this.connections.forEach((c) => c.disconnect())
  }

  fixedUpdate(signalBus: Signals.Bus<Ss>, dT: number) {
    this.systems.forEach((s) => {
      s.fixedUpdate?.(this, signalBus, dT)
    })
  }

  update(signalBus: Signals.Bus<Ss>, dT: number) {
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

  // Debug ⬇️

  initDebugIfNeeded(signals: Signals.Bus<Ss>) {
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
