import { Container, Text, Ticker, Graphics as PixiGraphics } from 'pixi.js'
import type { Disconnectable, Stage } from '../core'
import { Components } from '../components'
import { Signals } from '../signals'
import { Collider, Colliders, Collision } from '../collision'

export namespace Debug {
  export namespace Options {
    export interface CollisionSystem {
      rendersColliders: boolean
    }
    export interface Scene {
      showsStats: boolean
    }
  }

  export namespace Signal {
    export interface PhysicsEnabled {
      iterations: number
    }
  }
  export interface _Signals extends Signals {
    'physics-enabled': Signal.PhysicsEnabled
  }

  export class Display extends Container {
    stats?: StatsDisplay

    constructor(private options: Partial<Options.Scene>) {
      super()
    }

    init<Cs extends Components, Ss extends Signals>(stage: Stage<Cs>, signals: Signals.Bus<Ss>) {
      if (this.options.showsStats) {
        this.stats = new StatsDisplay()
        this.addChild(this.stats)

        this.stats.init(stage, signals)
      }
    }

    deinit() {
      this.stats?.deinit()
    }
  }

  interface Stats {
    fps: number
    bodyCount: number
    colliderCount: number
    physicsIterations?: number
  }

  export class StatsDisplay extends Container {
    private text = new Text({
      style: {
        fontSize: 16,
        fill: 0xffffff,
      },
    })
    private stats: Stats = {
      fps: 60,
      bodyCount: 0,
      colliderCount: 0,
    }
    private ticker = new Ticker()
    private connections: Disconnectable[] = []

    constructor() {
      super()

      this.ticker.maxFPS = 5

      this.addChild(this.text)
    }

    init<Cs extends Components, Ss extends Signals>(stage: Stage<Cs>, signalBus: Signals.Bus<Ss>) {
      this.connections.push(
        signalBus.connect('debug-physics-enabled', (s) => {
          this.stats.physicsIterations = s.iterations
        }),
      )

      this.ticker.add((_) => {
        const s = this.stats
        s.colliderCount = stage._colliders.length
        s.bodyCount = stage._colliders.reduce(
          (count, c) => (stage.hasComponent('rigid-body', c[0]) ? count++ : count),
          0,
        )

        this._update()
      })
      this.ticker.start()
    }

    deinit() {
      this.connections.forEach((c) => c.disconnect())
      this.connections.length = 0
    }

    update(fps: number) {
      this.stats.fps = fps
    }

    private _update() {
      const stats = this.stats

      let string = ''
      string += `FPS: ${stats.fps}`
      string += `\nBodies: ${stats.bodyCount}`
      string += `\nCollision sensors: ${stats.colliderCount}`
      if (stats.physicsIterations) string += `\nPhysics iterations: ${stats.physicsIterations}`

      this.text.text = string
    }
  }

  enum Color {
    COLLIDER = 0x00ffff,
  }

  export class Graphics extends PixiGraphics {
    drawCollider(collider: Collider) {
      collider.updateVerticesIfNeeded()

      if (collider instanceof Colliders.Circle) {
        const r = collider.radius
        const center = collider.center
        this.circle(center.x, center.y, r)
          .fill({ color: Color.COLLIDER, alpha: 0.5 })
          .stroke({ color: Color.COLLIDER, width: 2 })
          .moveTo(center.x, center.y)
          .lineTo(
            center.x + r * Math.cos(collider._transform.rotation),
            center.y + r * Math.sin(collider._transform.rotation),
          )
          .stroke({ color: Color.COLLIDER, width: 2 })
      } else if (collider instanceof Colliders.Polygon) {
        this.poly(collider._vertices)
          .fill({ color: Color.COLLIDER, alpha: 0.5 })
          .stroke({ color: Color.COLLIDER, width: 2 })
      }
    }

    drawCollisionContact(contact: Collision.Contact) {
      for (const cp of contact.points) {
        this.circle(cp.point.x, cp.point.y, 5).stroke({ color: 0xffffff, width: 2 })
      }
    }
  }
}
