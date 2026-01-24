export interface Signal {}

export namespace Signal {
  export interface EntityAdded extends Signal {
    id: number
  }

  export interface ScreenResized extends Signal {
    height: number
    width: number
  }
}
