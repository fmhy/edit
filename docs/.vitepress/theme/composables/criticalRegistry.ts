/**
 * Client-side registry of critical-note bodies.
 * CriticalBadge registers each note's rendered HTML on mount; Layout.vue
 * reads it when the main entry link is clicked to populate the modal dialog.
 */
const registry = new Map<string, { title: string; html: string }>()

export function registerCriticalNote(
  id: string,
  title: string,
  html: string
): void {
  registry.set(id, { title, html })
}

export function getCriticalNote(
  id: string
): { title: string; html: string } | undefined {
  return registry.get(id)
}
