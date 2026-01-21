export interface Signal {}

export namespace Signal {
  export interface ScreenResized extends Signal {
    height: number
    width: number
  }
}
