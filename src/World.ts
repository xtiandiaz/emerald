import { Container, DestroyOptions, RenderLayer } from 'pixi.js'
import { Component, Entity } from '.'

export class World extends Container {
  protected _entities = new Map<number, Entity>()

  private nextEntityId = 1
  private tags = new Map<string, Set<number>>()

  private renderLayers = new Map(
    [World.Layer.ENTITIES, World.Layer.UI, World.Layer.DEBUG].map((key) => [
      key,
      new RenderLayer(),
    ]),
  )
  private currentCameraEntityId?: number

  constructor() {
    super()

    this.renderLayers.forEach((rl) => this.addChild(rl))
  }

  // get currentCamera(): EntityComponent<Camera> | undefined {
  //   if (this.currentCameraEntityId && this.hasComponent('camera', this.currentCameraEntityId)) {
  //     return {
  //       entityId: this.currentCameraEntityId,
  //       component: this.getComponent('camera', this.currentCameraEntityId)!,
  //     }
  //   }
  //   return undefined
  // }

  getLayer(key: World.Layer): RenderLayer {
    return this.renderLayers.get(key)!
  }

  setCurrentCamera(entityId: number) {
    // if (this.id2ComponentsMap.has(entityId) && this.id2ComponentsMap.get(entityId)!.has('camera')) {
    //   this.currentCameraEntityId = entityId
    // } else {
    //   console.warn(`Undefined Camera for entity-id ${entityId}`)
    // }
  }

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

    // this.getLayer(Stage.Layer.ENTITIES).attach(entity)
    // this.addChild(entity)

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
    // this.signals?.emit('entity-removed', { removedId: id, tag })
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
    e.components.set(component.constructor.name, component)

    if (component instanceof Container) {
      this.addChild(component)
    }
    return component
  }

  hasComponent<T extends Component>(type: T, entityId: number): boolean {
    return this._entities.get(entityId)?.components.has(type.constructor.name) ?? false
  }

  getComponent<T extends Component>(
    typeValue: Component.Constructor<T>,
    entityId: number,
  ): T | undefined {
    return this._entities.get(entityId)?.components.get(typeValue.name) as T
  }

  removeComponent(key: string, entityId: number): boolean {
    const e = this._entities.get(entityId)
    if (!e) {
      console.error('Undefined entity', entityId)
      return false
    }
    const c = e.components.get(key)
    if (c instanceof Container) {
      this.removeChild(c)
    }

    return e.components.delete(key)
  }

  destroy(options?: DestroyOptions): void {
    this._entities.clear()
    this.tags.clear()

    super.destroy(true)
  }

  // private onComponentAdded<K extends keyof C>(_: K, component: C[K], entity: Entity<C>) {
  // if (component instanceof Collider) {
  //   this.resetColliderEntry(component, entity.id)
  //   this.getComponent('rigid-body', entity.id)?.resetAreaProperties(component._physicsProperties)
  // } else if (component instanceof RigidBody) {
  //   component._transform.setFromMatrix(entity.getGlobalTransform())
  //   const collider = this.getComponent('collider', entity.id)
  //   if (collider) {
  //     component.resetAreaProperties(collider._physicsProperties)
  //   }
  // }
  // }
}

export namespace World {
  export enum Layer {
    ENTITIES = 'entities',
    UI = 'ui',
    DEBUG = 'debug',
  }
}
