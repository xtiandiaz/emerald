export interface Signal {}

export namespace Signal {
  export interface EntityAdded extends Signal {
    addedId: number
  }
  export interface EntityRemoved extends Signal {
    removedId: number
    tag?: string
  }

  // export class GestureSignal<T extends Gesture> extends Signal {
  //   constructor(public gesture: T) {
  //     super()
  //   }
  // }

  export interface ScreenResized extends Signal {
    height: number
    width: number
  }
}
