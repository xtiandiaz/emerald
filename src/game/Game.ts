import { Application, Ticker, type ApplicationOptions } from 'pixi.js'
import { Scene, Screen, type Disconnectable } from '../core'
import { type FixedTime, type GameState } from '.'
import { Components } from '../components'
import { Signals, SignalController } from '../signals'
import { EMath } from '../extras'
import { Debug } from '../debug'

export class Game<
  State extends GameState,
  Cs extends Components,
  Ss extends Signals,
> extends Application {
  protected signalController!: SignalController<Ss>
  protected scene?: Scene<Cs, Ss>
  private connections: Disconnectable[] = []
  private fixedTime: FixedTime = {
    step: 1 / 60,
    reserve: 0,
  }
  private debugDisplay?: Debug.Display

  constructor(
    public state: State,
    private scenes: Scene<Cs, Ss>[],
  ) {
    super()
  }

  connect?(signals: Signals.Bus<Ss>, state: State): Disconnectable[]

  async init(options: Partial<Game.Options>): Promise<void> {
    await super.init(options)

    this.signalController = new SignalController()

    this.connections.push(...(this.connect?.(this.signalController, this.state) ?? []))

    this.ticker.add(this.fixedUpdate, this)
    this.ticker.add(this.update, this)

    this.renderer.on('resize', this.onResized, this)
    this.onResized(this.screen.width, this.screen.height)
  }

  deinit() {
    this.debugDisplay?.deinit()

    this.ticker.remove(this.fixedUpdate, this)
    this.ticker.remove(this.update, this)

    this.renderer.removeAllListeners()

    this.scene?.deinit()
    this.scene = undefined

    this.stage.removeChildren()

    this.connections.forEach((d) => d.disconnect())
    this.connections.length = 0
  }

  async play(label: string) {
    const nextScene = this.scenes.find((s) => s.label == label)
    if (!nextScene) {
      console.error(`Unknown Scene '${label}'`)
      return
    }

    if (this.scene) {
      this.stage.removeChild(this.scene)
      this.scene.deinit()
    }

    await nextScene.init(this.signalController)

    this.scene = nextScene
    this.stage.addChild(this.scene)
  }

  private fixedUpdate(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.fixedTime.reserve = EMath.clamp(this.fixedTime.reserve + ticker.deltaMS, 0, 0.1)

    while (this.scene && this.fixedTime.reserve >= this.fixedTime.step) {
      this.scene.fixedUpdate(this.signalController, this.fixedTime.step)

      this.fixedTime.reserve -= this.fixedTime.step
    }
  }

  private update(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.signalController.emitQueuedSignals()

    this.scene?.update(this.signalController, ticker.deltaTime)
    this.scene?.updateDebug(ticker.FPS)
  }

  private onResized(width: number, height: number) {
    Screen._width = width
    Screen._height = height

    this.signalController.queue('screen-resized', { width, height })
  }
}

export namespace Game {
  export interface Options extends ApplicationOptions {}
}
