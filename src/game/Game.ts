import { Application, Container, Ticker, type ApplicationOptions } from 'pixi.js'
import { type FixedTime, type GameState } from '.'
import {
  Scene,
  Screen,
  SignalController,
  clamp,
  type SignalBus,
  type Disconnectable,
} from '../core'
import { ScreenResized } from '../signals'
import { Debug } from '../debug'

export interface GameOptions extends ApplicationOptions {
  debug: Debug.GameOptions
}

export class Game<State extends GameState> extends Application {
  protected display!: Container
  protected signalController!: SignalController
  protected scene?: Scene
  private connections: Disconnectable[] = []
  private fixedTime: FixedTime = {
    step: 1 / 60,
    reserve: 0,
  }
  private options?: Partial<GameOptions>
  private debugDisplay?: Debug.Display

  constructor(
    public state: State,
    private scenes: Scene[],
  ) {
    super()
  }

  connect?(signalBus: SignalBus, state: State): Disconnectable[]

  async init(options: Partial<GameOptions>): Promise<void> {
    this.options = options

    await super.init(options)

    this.display = new Container()
    this.stage.addChild(this.display)

    this.signalController = new SignalController()

    this.initDebugIfNeeded()

    this.connections.push(...(this.connect?.(this.signalController, this.state) ?? []))

    this.ticker.add(this.fixedUpdate, this)
    this.ticker.add(this.update, this)

    this.renderer.on('resize', this.onResized, this)
    this.onResized(this.screen.width, this.screen.height)

    this.display.hitArea = this.screen
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
      return
    }

    if (this.scene) {
      this.stage.removeChild(this.scene)
      this.scene.deinit()
    }

    await nextScene.init(this.signalController, this.display)

    this.scene = nextScene
    this.stage.addChild(this.scene)
  }

  private fixedUpdate(ticker: Ticker) {
    if (this.state.isPaused) {
      return
    }
    this.fixedTime.reserve = clamp(this.fixedTime.reserve + ticker.deltaMS, 0, 0.1)

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
  }

  private onResized(width: number, height: number) {
    Screen._w = width
    Screen._h = height
    this.display.width = width
    this.display.height = height

    this.signalController.queue(new ScreenResized(width, height))
  }

  private initDebugIfNeeded() {
    if (!this.options?.debug) {
      return
    }
    this.debugDisplay = new Debug.Display(this.options.debug)
    this.stage.addChild(this.debugDisplay)

    // this.debugDisplay.init(this.ticker, this.signalController)
  }
}
