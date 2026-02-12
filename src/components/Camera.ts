import { Point, type PointData } from 'pixi.js'
import type { Component } from '../core'

export class Camera implements Component, Camera.Options {
  isCurrent: boolean
  positionEase?: number
  readonly offset: Point

  constructor(public options?: Partial<Camera.Options>) {
    this.isCurrent = options?.isCurrent ?? false
    this.offset = new Point(options?.offset?.x, options?.offset?.y)
    this.positionEase = options?.positionEase
  }
}
export namespace Camera {
  export interface Options {
    isCurrent: boolean
    offset: PointData
    positionEase?: number
  }
}
