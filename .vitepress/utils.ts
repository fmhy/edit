export function groupBy<T, K extends keyof any>(
  arr: T[],
  key: (i: T) => K
): Record<K, T[]> {
  return arr.reduce(
    (groups, item) => {
      ;(groups[key(item)] ||= []).push(item)
      return groups
    },
    {} as Record<K, T[]>
  )
}
