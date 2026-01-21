export class Screen {
  private constructor() {}

  static _width = 0
  static get width(): number {
    return Screen._width
  }

  static _height = 0
  static get height(): number {
    return Screen._height
  }
}
