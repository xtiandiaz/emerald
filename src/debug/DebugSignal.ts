import { Signal } from '../core'

export namespace DebugSignal {
  export class PhysicsEnabled extends Signal {
    constructor(public iterations: number) {
      super()
    }
  }
}
