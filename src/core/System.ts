import type { Stage, Disconnectable } from './'
import { Components } from '../components'
import { Signals } from '../signals'
import { Input } from '../input'

export class System<C extends Components, S extends Signals> {
  protected connections: Disconnectable[] = []

  _init(stage: Stage<C>, signals: Signals.Bus<S>, input: Input.Provider) {
    this.connections.push(...(this.init?.(stage, signals, input) ?? []))
  }
  init?(stage: Stage<C>, signals: Signals.Bus<S>, input: Input.Provider): Disconnectable[]

  deinit() {
    this.connections.forEach((c) => c.disconnect())
    this.connections.length = 0
  }

  fixedUpdate?(stage: Stage<C>, signals: Signals.Emitter<S>, dT: number): void
  update?(stage: Stage<C>, signals: Signals.Emitter<S>, dT: number): void
}
