import { Disconnectable } from './types'

export namespace ConnectableUtils {
  export function timer(
    intervalMS: number,
    repeats: boolean,
    callback: () => void,
  ): Disconnectable {
    let intervalId: NodeJS.Timeout
    const disconnect = () => clearInterval(intervalId)
    intervalId = setInterval(() => {
      callback()
      if (!repeats) disconnect()
    }, intervalMS)

    return {
      disconnect,
    }
  }
}
