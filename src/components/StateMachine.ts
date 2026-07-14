export class StateMachine<Key> {
  readonly states = new Map<Key, StateMachine.State>()
  private _currentState?: StateMachine.State | undefined

  constructor(private readonly startKey: Key) {}

  public get currentState(): StateMachine.State | undefined {
    return this._currentState
  }

  init(): void {
    this.transition(this.startKey)
  }

  transition(key: Key) {
    this._currentState?.onExited()
    this._currentState = this.states.get(key)
    if (!this._currentState) {
      console.error('Undefined State', key)
      return
    }
    this._currentState.onEntered()
  }

  update(): void {
    this._currentState?.update?.()
  }
}

export namespace StateMachine {
  export interface State {
    onEntered(): void
    onExited(): void

    update?(): void
  }
}
