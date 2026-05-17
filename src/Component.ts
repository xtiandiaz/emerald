export type Component = Object

export namespace Component {
  export type Constructor<T extends Component> = new (...params: any[]) => T
}
