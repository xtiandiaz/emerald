import type { Size } from 'pixi.js'

export class Screen {
  private static _size: Size = { width: 0, height: 0 }
  private static _halfSize: Size = { width: 0, height: 0 }

  private constructor() {}

  static get width(): number {
    return Screen._size.width
  }

  static get height(): number {
    return Screen._size.height
  }

  static get halfWidth(): number {
    return Screen._halfSize.width
  }

  static get halfHeight(): number {
    return Screen._halfSize.height
  }

  static _setSize(width: number, height: number) {
    this._size.width = width
    this._size.height = height
    this._halfSize.width = width * 0.5
    this._halfSize.height = height * 0.5
  }
}
