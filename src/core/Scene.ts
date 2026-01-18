import { Container } from 'pixi.js'
import { World, System, type Disconnectable, type SignalBus } from '../core'
import { Input, InputController } from '../input'

export abstract class Scene {
  abstract readonly systems: System[]
  abstract readonly inputMap?: Record<string, Input.Control>
  protected input = new InputController<keyof typeof this.inputMap>()
  protected connections: Disconnectable[] = []

  constructor(public readonly label: string) {}

  async load?(): Promise<void>

  abstract build(world: World): void

  async init(world: World, signalBus: SignalBus, display: Container): Promise<void> {
    await this.load?.()

    this.build(world)

    this.systems.forEach((s) => s.init?.(world, signalBus))

    if (this.inputMap) {
      this.input.init(this.inputMap, display, (signal) => this.onInput?.(signal, world))
    }
  }

  deinit(): void {
    this.input.deinit()

    this.connections.forEach((c) => c.disconnect())
    this.systems.forEach((s) => s.deinit?.())
  }

  protected onInput(signal: Input.Signal<any>, world: World): void {
    this.systems.forEach((s) => s.onInput?.(signal, world))
  }
}
