import { ContainerChild, ContainerEvents, Sprite } from 'pixi.js'
import { ComponentIndex, Stage, System, type Disconnectable, type SignalBus } from '../core'
import { Input } from '../input'
import { ScreenResized } from '../signals'

export class Scene<CI extends ComponentIndex> extends Stage<CI> implements Input.Provider {
  protected connections: Disconnectable[] = []
  private inputPad = new Sprite()

  constructor(
    public readonly label: string,
    protected readonly systems: System<CI>[],
  ) {
    super()

    this.inputPad.eventMode = 'static'
    this.getLayer(Stage.Layer.UI).attach(this.inputPad)
    this.addChild(this.inputPad)
  }

  async load?(): Promise<void>

  build?(stage: Stage<CI>): void

  connect?(input: Input.Provider, signals: SignalBus): Disconnectable[]

  async init(signalBus: SignalBus): Promise<void> {
    await this.load?.()

    this.build?.(this)

    this.connect?.(this, signalBus)

    this.systems.forEach((s) => this.connections.push(...(s.init?.(this, signalBus, this) ?? [])))

    signalBus.connect(ScreenResized, (s) => {
      this.inputPad.width = s.width
      this.inputPad.height = s.height
    })
  }

  deinit(): void {
    this.connections.forEach((c) => c.disconnect())
  }

  fixedUpdate(signalBus: SignalBus, dT: number) {
    this.systems.forEach((s) => {
      s.fixedUpdate?.(this, signalBus, dT)
    })
  }

  update(signalBus: SignalBus, dT: number) {
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
}
