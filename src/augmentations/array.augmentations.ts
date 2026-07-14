declare global {
  interface ArrayConstructor {
    groupedFrom<K extends string | number, V extends object>(
      array: V[],
      selector: (value: V) => K,
    ): V[][]

    range(start: number, end: number, step?: number): number[]
  }
}

export function group<K extends string | number, V extends object>(
  array: V[],
  keySelector: (element: V) => K,
): V[][] {
  return array.reduce((groups, value) => {
    const key = keySelector(value)
    const group = groups.find((g) => keySelector(g[0]!) == key)
    if (group) {
      group.push(value)
    } else {
      groups.push([value])
    }

    return groups
  }, new Array<V[]>())
}

export const range = (start: number, end: number, step?: number) => {
  step = step ?? 1

  return Array.from({ length: Math.floor((end - start) / step) }, (_, key) => key * step + start)
}

Array.groupedFrom = group
Array.range = range
