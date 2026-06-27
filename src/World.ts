import { Container } from 'pixi.js'
import { ComponentConstructor, Entity, Transform } from '.'
import { RigidBody } from './components'

export class World extends Container {
  _rbs = new Array<[RigidBody, entityId: number]>()

  protected _entities = new Map<number, Entity>()

  private nextEntityId = 1
  private tags = new Map<string, Set<number>>()

  createEntity(options?: Partial<Entity.Options>): number {
    const id = this.nextEntityId++
    const e = new Entity(id, options)
    this._entities.set(id, e)

    if (options?.tag) {
      this.tag(id, options.tag)
    }

    this.addChild(e)
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

    this.removeChild(e)
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

  addComponent<T extends Object>(component: T, entityId: number) {
    const e = this._entities.get(entityId)
    if (!e) {
      console.error('Undefined entity', entityId)
      return
    }
    const name = component.constructor.name
    if (e.components.has(name)) {
      if (!this._removeComponent(name, entityId)) {
        console.error(`Can't add duplicate ${name} component`)
        return
      }
    }
    e.components.set(name, component)
    if (component instanceof RigidBody) {
      this._rbs.push([component, entityId])
      // console.log(this._rbs.length)
    } else if (component instanceof Container) {
      e.addChild(component)
    }

    return component
  }

  hasComponent<T extends Object>(typeValue: ComponentConstructor<T>, entityId: number): boolean {
    return this._entities.get(entityId)?.components.has(typeValue.name) ?? false
  }

  getComponent<T extends Object>(
    typeValue: ComponentConstructor<T>,
    entityId: number,
  ): T | undefined {
    return this._entities.get(entityId)?.components.get(typeValue.name) as T
  }

  getComponents<T extends Object>(typeValue: ComponentConstructor<T>): Map<number, T> {
    return new Map(
      this._entities
        .values()
        .filter((e) => e.components.has(typeValue.name))
        .map((e) => [e.id, e.components.get(typeValue.name)! as T]),
    )
  }

  getLikeComponents<T extends Object>(typeValue: ComponentConstructor<T>, entityId: number) {
    return this._entities
      .get(entityId)
      ?.components.values()
      .filter((c) => c instanceof typeValue)
      .map((c) => c as T)
  }

  removeComponent<T extends Object>(typeValue: ComponentConstructor<T>, entityId: number): boolean {
    return this._removeComponent(typeValue.name, entityId)
  }

  getTransform(entityId: number): Transform | undefined {
    return this._entities.get(entityId)
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
    if (c instanceof RigidBody) {
      const i = this._rbs.findIndex(([, id]) => id === entityId)
      this._rbs.splice(i, 1)
    } else if (c instanceof Container) {
      e.removeChild(c)
    }

    return e.components.delete(name)
  }
}
