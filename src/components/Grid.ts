import { Container } from 'pixi.js'
import { DirectionKey } from '../types'

export class Grid<Key, Layer, Tile extends Grid.Tile<Key>> extends Container {
  tiles: Map<Layer, Array<Tile | undefined>>

  constructor(
    protected readonly cols: number,
    protected readonly rows: number,
    protected tileFactory: Grid.TileFactory<Key>,
    protected tileMap: Grid.TileMap<Key, Layer>,
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

  getTileKey(location: Grid.Location<Layer>): Key | undefined {
    return this.tileMap.get(location.layer)?.[(location.row * this.cols) | location.col]
  }

  getNextLocation(
    from: Grid.Location<Layer>,
    toward: DirectionKey,
  ): Grid.Location<Layer> | undefined {
    throw new Error('Not implemented')
  }

  setTile(key: Key, col: number, row: number, layer: Layer) {
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

  removeTile(col: number, row: number, layer: Layer) {
    if (!this.hasLocation(col, row, layer)) {
      return
    }
    const i = row * this.cols + col
    const subMap = this.tiles.get(layer)
    const tile = subMap?.at(i)
    if (tile) this.removeChild(tile)
    if (subMap) subMap[i] = undefined
  }

  hasLocation(col: number, row: number, layer: Layer) {
    return col < this.cols && row < this.rows && this.tileMap.has(layer)
  }
}

export namespace Grid {
  export interface Location<Layer> {
    col: number
    row: number
    layer: Layer
  }

  export interface Tile<K> extends Container {
    readonly key: K
  }

  export type TileFactory<K> = (key: K) => Tile<K> | undefined

  export type TileMap<Key, Layer> = Map<Layer, Array<Key>>
}
