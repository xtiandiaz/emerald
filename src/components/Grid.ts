import { Container } from 'pixi.js'

export class Grid<K, T extends Grid.Tile<K>> extends Container {
  tiles: Map<Grid.Layer, Array<T | undefined>>

  constructor(
    protected readonly cols: number,
    protected readonly rows: number,
    protected tileFactory: Grid.TileFactory<K>,
    protected tileMap: Grid.TileMap<K>,
    protected readonly unitSize: number,
  ) {
    super()

    this.tiles = new Map(tileMap.keys().map((k) => [k, new Array(cols * rows)]))

    for (const [layer, map] of tileMap.entries()) {
      for (let i = 0; i < map.length; i++) {
        this.setTile(map[i], i % cols, Math.floor(i / cols), layer)
      }
    }
  }

  setTile(key: K, col: number, row: number, layer: Grid.Layer) {
    if (!this.hasLocation(col, row, layer)) {
      console.error(`Undefined Grid location, col: ${col}, row: ${row}, layer: ${layer}`)
      return
    }
    this.removeTile(col, row, layer)

    const tile = this.tileFactory(key)
    if (tile) {
      tile.position.set(col * this.unitSize, row * this.unitSize)
      this.addChild(tile)
    }
  }

  removeTile(col: number, row: number, layer: Grid.Layer) {
    if (!this.hasLocation(col, row, layer)) {
      return
    }
    const i = row * this.cols + col
    const subMap = this.tiles.get(layer)
    const tile = subMap?.at(i)
    if (tile) this.removeChild(tile)
    if (subMap) subMap[i] = undefined
  }

  hasLocation(col: number, row: number, layer: Grid.Layer) {
    return col < this.cols && row < this.rows && this.tileMap.has(layer)
  }
}

export namespace Grid {
  export type Layer = string | number

  export interface Tile<K> extends Container {
    readonly key: K
  }

  export type TileFactory<K> = (key: K) => Tile<K> | undefined

  export type TileMap<Key> = Map<Layer, Array<Key>>
}
