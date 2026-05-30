import { Container, Transform } from 'pixi.js'
import { Component, Entity } from '.'
import { Collider, RigidBody } from './components'

export class World extends Container {
  protected _entities = new Map<number, Entity>()
  // private rbs = new Array<RigidBody>()
  // private trs = new Array<Transform>()

  private nextEntityId = 1
  private tags = new Map<string, Set<number>>()

  createEntity(tag?: string): number {
    const id = this.nextEntityId++
    this._entities.set(id, {
      id,
      tag,
      components: new Map<string, Component>(),
    })
    if (tag) {
      this.tag(id, tag)
    }
    return id
  }

  hasEntity(id: number): boolean {
    return this._entities.has(id)
  }

  removeEntity(id: number): boolean {
    const e = this._entities.get(id)
    if (!e) {
      return false
    }
    for (const [, c] of e.components) {
      if (c instanceof Container) {
        this.removeChild(c)
      }
    }
    if (e.tag) {
      this.tags.get(e.tag)?.delete(e.id)
    }
    return this._entities.delete(id)
  }

  tag(entityId: number, tag: string) {
    const e = this._entities.get(entityId)
    if (!e) {
      return
    }
    const prevTag = e.tag
    if (prevTag) {
      this.tags.get(prevTag)?.delete(e.id)
    }
    if (!this.tags.has(tag)) {
      this.tags.set(tag, new Set<number>())
    }
    this.tags.get(tag)!.add(e.id)
  }

  getTag(entityId: number): string | undefined {
    return this._entities.values().find((e) => e.id === entityId)?.tag
  }

  getTaggedEntities(tag: string): number[] {
    return [...(this.tags.get(tag) ?? [])]
  }

  addComponent<T extends Component>(component: T, entityId: number) {
    const e = this._entities.get(entityId)
    if (!e) {
      console.error('Undefined entity', entityId)
      return
    }
    const name = component.constructor.name
    if (e.components.has(name)) {
      this._removeComponent(name, entityId)
    }
    e.components.set(name, component)
    if (component instanceof Container) {
      this.addChild(component)
    }
    return component
  }

  hasComponent<T extends Component>(
    typeValue: Component.Constructor<T>,
    entityId: number,
  ): boolean {
    return this._entities.get(entityId)?.components.has(typeValue.name) ?? false
  }

  getComponent<T extends Component>(
    typeValue: Component.Constructor<T>,
    entityId: number,
  ): T | undefined {
    return this._entities.get(entityId)?.components.get(typeValue.name) as T
  }

  getComponents<T extends Component>(typeValue: Component.Constructor<T>): Map<number, T> {
    return new Map(
      this._entities
        .values()
        .filter((e) => e.components.has(typeValue.name))
        .map((e) => [e.id, e.components.get(typeValue.name)! as T]),
    )
  }

  getLikeComponents<T extends Component>(typeValue: Component.Constructor<T>, entityId: number) {
    return this._entities
      .get(entityId)
      ?.components.values()
      .filter((c) => c instanceof typeValue)
      .map((c) => c as T)
  }

  removeComponent<T extends Component>(
    typeValue: Component.Constructor<T>,
    entityId: number,
  ): boolean {
    return this._removeComponent(typeValue.name, entityId)
  }

  destroy(): void {
    this._entities.clear()
    this.tags.clear()

    super.destroy(true)
  }

  private _removeComponent(name: string, entityId: number): boolean {
    const e = this._entities.get(entityId)
    if (!e) {
      console.error('Undefined entity', entityId)
      return false
    }
    const c = e.components.get(name)
    if (c instanceof Container) {
      this.removeChild(c)
    }
    return e.components.delete(name)
  }
}

export namespace World {
  export enum Layer {
    ENTITIES = 'entities',
    UI = 'ui',
    DEBUG = 'debug',
  }
}
