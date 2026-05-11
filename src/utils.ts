import type { Disconnectable } from './types'

export namespace ConnectableUtils {
  export function timer(
    intervalMS: number,
    repeats: boolean,
    callback: () => void,
  ): Disconnectable {
    let intervalId: number
    const disconnect = () => clearInterval(intervalId)
    intervalId = Number(
      setInterval(() => {
        callback()
        if (!repeats) disconnect()
      }, intervalMS),
    )

    return {
      disconnect,
    }
  }
}
