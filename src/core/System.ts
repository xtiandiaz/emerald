import type { SignalBus, Disconnectable, Stage, ComponentIndex } from './'
import { Input } from '../input'

export class System<CI extends ComponentIndex> {
  init?(stage: Stage<CI>, signals: SignalBus, input: Input.Provider): Disconnectable[]

  fixedUpdate?(stage: Stage<CI>, signals: SignalBus, dT: number): void
  update?(stage: Stage<CI>, signals: SignalBus, dT: number): void
}
