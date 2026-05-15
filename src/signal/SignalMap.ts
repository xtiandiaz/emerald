export type SignalMap = {
  'entity-added': {
    id: number
    tag?: string
  }
  'entity-removed': {
    id: number
    tag?: string
  }
  'screen-resized': {
    height: number
    width: number
  }
}
