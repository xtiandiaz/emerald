export namespace EColor {
  export const componenHexString = (component: number): string => {
    const hex = Math.round(component * 255).toString(16)
    return hex.length == 1 ? '0' + hex : hex
  }

  export const hexColorCode = (r: number, g: number, b: number): string => {
    return `${componenHexString(r)}${componenHexString(g)}${componenHexString(b)}`
  }

  export function getRandomColor(): string {
    return hexColorCode(Math.random(), Math.random(), Math.random())
  }
}
