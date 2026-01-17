import type { SignalBus, Disconnectable, World } from './'
import { Input } from '../input'

export class System {
  protected connections: Disconnectable[] = []

  init?(world: World, signalBus: SignalBus): void

  deinit() {
    this.connections.forEach((d) => d.disconnect())
    this.connections.length = 0
  }

  fixedUpdate?(world: World, signalBus: SignalBus, dT: number): void
  update?(world: World, signalBus: SignalBus, dT: number): void

  onInput?(signal: Input.Signal<any>, world: World): void
}
