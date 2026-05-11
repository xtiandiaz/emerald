import * as PIXI from 'pixi.js'
import { gsap } from 'gsap'
import PixiPlugin from 'gsap/PixiPlugin'

// export type Ease = gsap.EaseString | gsap.EaseFunction

// declare namespace GSAP {
//   interface Timeline {
//     pixiTo: (
//       target: PIXI.Container,
//       vars: PixiPlugin.Vars,
//       ease: Ease,
//       duration: number,
//     ) => gsap.core.Tween
//   }
// }

// GSAP.core.Timeline.prototype.pixiTo = function (this) {}

export interface PixiTweenParams extends gsap.TweenVars {
  vars: PixiPlugin.Vars
  startVars?: PixiPlugin.Vars
}

export class Tweener {
  private static sharedInstance?: Tweener

  constructor() {
    PixiPlugin.registerPIXI(PIXI)
    gsap.registerPlugin(PixiPlugin)
  }

  static get shared(): Tweener {
    if (!this.sharedInstance) {
      this.sharedInstance = new Tweener()
    }
    return this.sharedInstance
  }

  timeline(): gsap.core.Timeline {
    return gsap.timeline()
  }

  to(target: PIXI.Container, params: PixiTweenParams) {
    return gsap.to(target, { pixi: params.vars, startAt: { pixi: params.startVars } })
  }

  async toAsync(target: PIXI.Container, params: PixiTweenParams) {
    const tw = this.to(target, params)

    return new Promise<gsap.core.Tween>((resolve) => {
      tw.vars.onComplete = () => {
        resolve(tw)
      }
    })
  }

  killTweensOf(target: PIXI.Container) {
    gsap.killTweensOf(target)
  }
}
