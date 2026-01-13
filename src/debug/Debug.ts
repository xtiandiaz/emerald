import { Container, type Renderer, Text, Ticker } from 'pixi.js'
import { ExtraMath } from '../extras'
import type { World } from '..'

export namespace Debug {
  export interface Options {
    showStats: boolean
  }

  export class Display extends Container {
    stats?: StatsDisplay

    constructor(options: Partial<Options>) {
      super()

      if (options.showStats) {
        this.stats = new StatsDisplay()
        this.addChild(this.stats)
      }
    }
  }

  export interface Stats {
    fps: number
    bodyCount: number
    collisionSensorCount: number
  }

  export class StatsDisplay extends Container {
    private text = new Text({
      text: 'stats',
      style: {
        fontSize: 16,
        fill: 0xffffff,
      },
    })
    private stats: Stats = {
      fps: 60,
      bodyCount: 0,
      collisionSensorCount: 0,
    }
    private ticker = new Ticker()

    constructor() {
      super()

      this.ticker.maxFPS = 5

      this.addChild(this.text)
    }

    init(gameTicker: Ticker, world: World) {
      this.ticker.add((_) => {
        const s = this.stats
        s.fps = Math.round(gameTicker.FPS * 10) / 10
        s.bodyCount = world._bodies.length
        s.collisionSensorCount = world._collisionSensors.length

        this.update()
      })
      this.ticker.start()
    }

    private update() {
      const stats = this.stats
      let string = ''

      string += `FPS: ${stats.fps}`
      string += `\nBodies: ${stats.bodyCount}`
      string += `\nCollision sensors: ${stats.collisionSensorCount}`

      this.text.text = string
    }
  }
}
