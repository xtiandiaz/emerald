import { Point, type PointData } from 'pixi.js'
import type { Component } from '../core'
import { EMath } from '../extras'

export class Camera implements Component, Camera.Options {
  readonly offset: Point
  speed?: number
  private _zoom: number

  constructor(public options?: Partial<Camera.Options>) {
    this.offset = new Point(options?.offset?.x, options?.offset?.y)
    this._zoom = options?.zoom ?? 1
    this.speed = options?.speed
  }

  get zoom(): number {
    return this._zoom
  }

  set zoom(value: number) {
    this._zoom = EMath.clamp(value, 0, Infinity)
  }
}

export namespace Camera {
  export interface Options {
    offset: PointData
    zoom: number
    speed?: number
  }
}
