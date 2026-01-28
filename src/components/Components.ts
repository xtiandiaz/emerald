import { Component } from '../core'
import { Collider } from './Collider'
import { RayCast } from './RayCast'
import { RigidBody } from './RigidBody'

export interface Components {
  collider: Collider
  'ray-cast': RayCast
  'rigid-body': RigidBody
  [key: string]: Component
}
