import type { Component } from '../core'
import { Collision } from '../collision'

export class RayCast implements Component {
  readonly rays: Map<string, Collision.Ray>

  constructor(...entries: [string, Collision.Ray][]) {
    this.rays = new Map(entries)
  }
}
