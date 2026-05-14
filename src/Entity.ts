import { Component } from './component'

export interface Entity {
  readonly id: number
  components: Map<string, Object>
  tag?: string
}
