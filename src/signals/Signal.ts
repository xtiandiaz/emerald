export interface Signal {}

export namespace Signal {
  export interface Action extends Signal {
    key: string
  }

  export interface EntityAdded extends Signal {
    addedId: number
  }
  export interface EntityRemoved extends Signal {
    removedId: number
    tag?: string
  }

  export interface ScreenResized extends Signal {
    height: number
    width: number
  }
}
