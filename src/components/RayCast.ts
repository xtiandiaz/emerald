import type { Component } from '../core'
import { Collision } from '../collision'

export class RayCast implements Component {
  readonly rays: Map<string, Collision.Ray>
  readonly casts = new Map<string, boolean>()

  constructor(...entries: [string, Collision.Ray][]) {
    this.rays = new Map(entries)
  }

  // Returns the rays that can be casted on the target layer
  filter(layer: number): [string, Collision.Ray][] {
    return [...this.rays].filter(([_, r]) => r.canCollide(layer))
  }

  reset() {
    this.casts.clear()
    this.rays.forEach((r) => (r.intersects = false))
  }
}
