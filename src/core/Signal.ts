export class _Signal<D> {
  constructor(
    public readonly code: string,
    public readonly data: D,
  ) {}
}

export abstract class Signal {
  readonly name: string

  constructor() {
    this.name = this.constructor.name
  }
}
