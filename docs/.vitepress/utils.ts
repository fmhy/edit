export function groupBy<T, K extends keyof any>(
  arr: T[],
  key: (i: T) => K
): Record<K, T[]> {
  return arr.reduce(
    (groups, item) => {
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      ;(groups[key(item)] ||= []).push(item)
      return groups
    },
    {} as Record<K, T[]>
  )
}
