import { Component } from '../core'
import { Collider } from '../collision'
import { PointData } from 'pixi.js'

export class CollisionSensor implements Component, Collider {
  readonly collidedIds = new Set<number>()

  constructor(
    public readonly shape: Collider.Shape,
    public layer = 1,
  ) {}

  _updateTransform(position: PointData, rotation: number, scale: number): void {
    this.shape._transform.position.copyFrom(position)
    this.shape._transform.rotation = rotation
    this.shape._transform.scale.set(scale)
  }
}
