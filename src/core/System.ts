import type { Stage, Disconnectable } from './'
import { Components } from '../components'
import { Signals } from '../signals'
import { Input } from '../input'

export class System<Cs extends Components, Ss extends Signals> {
  init?(stage: Stage<Cs>, signals: Signals.Bus<Ss>, input: Input.Provider): Disconnectable[]

  fixedUpdate?(stage: Stage<Cs>, signals: Signals.Emitter<Ss>, dT: number): void
  update?(stage: Stage<Cs>, signals: Signals.Emitter<Ss>, dT: number): void
}
