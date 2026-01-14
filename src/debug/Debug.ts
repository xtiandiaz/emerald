import { Container, Text, Ticker } from 'pixi.js'
import type { Disconnectable, SignalBus, World } from '..'
import { DebugSignal } from './DebugSignal'

export namespace Debug {
  export interface GameOptions {
    showsStats: boolean
  }

  export interface PhysicsSystemOptions {
    reportsSettings: boolean
    drawsCollisions: boolean
  }

  export class Display extends Container {
    private stats?: StatsDisplay

    constructor(private options: Partial<GameOptions>) {
      super()
    }

    init(ticker: Ticker, world: World, signalBus: SignalBus) {
      if (this.options.showsStats) {
        this.stats = new StatsDisplay()
        this.addChild(this.stats)

        this.stats.init(ticker, world, signalBus)
      }
    }

    deinit() {
      this.stats?.deinit()
    }
  }

  interface Stats {
    fps: number
    bodyCount: number
    collisionSensorCount: number
    physicsIterations?: number
  }

  export class StatsDisplay extends Container {
    private text = new Text({
      text: 'stats',
      style: {
        fontSize: 20,
        fill: 0xffffff,
      },
    })
    private stats: Stats = {
      fps: 60,
      bodyCount: 0,
      collisionSensorCount: 0,
    }
    private _ticker = new Ticker()
    private connections: Disconnectable[] = []

    constructor() {
      super()

      this._ticker.maxFPS = 5

      this.addChild(this.text)
    }

    init(ticker: Ticker, world: World, signalBus: SignalBus) {
      this.connections.push(
        signalBus.connect(DebugSignal.PhysicsEnabled, (s) => {
          this.stats.physicsIterations = s.iterations
        }),
      )

      this._ticker.add((_) => {
        const s = this.stats
        s.fps = Math.round(ticker.FPS * 10) / 10
        s.bodyCount = world._bodies.length
        s.collisionSensorCount = world._collisionSensors.length

        this.update()
      })
      this._ticker.start()
    }

    deinit() {
      this.connections.forEach((c) => c.disconnect())
      this.connections.length = 0
    }

    private update() {
      const stats = this.stats
      let string = ''

      string += `FPS: ${stats.fps}`
      string += `\nBodies: ${stats.bodyCount}`
      string += `\nCollision sensors: ${stats.collisionSensorCount}`
      if (stats.physicsIterations) string += `\nPhysics iterations: ${stats.physicsIterations}`

      this.text.text = string
    }
  }
}
