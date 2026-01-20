declare global {
  interface ObjectConstructor {
    fromArray<K extends string | number, V extends object>(
      array: V[],
      keySelector: (value: V) => K,
    ): Record<K, V[]> // same as: { [key in K]: V[] }
  }
}

export function groupArrayAndMapAsRecord<K extends string | number, V extends object>(
  array: V[],
  keySelector: (value: V) => K,
): Record<K, V[]> {
  return array.reduce(
    (record, value) => {
      const key = keySelector(value)
      if (record[key]) {
        record[key].push(value)
      } else {
        record[key] = [value]
      }
      return record
    },
    {} as Record<K, V[]>,
  )
}

Object.fromArray = groupArrayAndMapAsRecord
