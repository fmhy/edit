import type { SemanticHit } from './semantic'
import { withBase } from 'vitepress'
import { SEMANTIC_INDEX_FILE } from './semantic'

let worker: Worker | null = null
let nextId = 0
const pending = new Map<
  number,
  { resolve: (hits: SemanticHit[]) => void; reject: (e: Error) => void }
>()

function request(query?: string): Promise<SemanticHit[]> {
  if (!worker) {
    worker = new Worker(new URL('./semantic.worker.ts', import.meta.url), {
      type: 'module'
    })
    worker.onmessage = (
      e: MessageEvent<{ id: number; hits?: SemanticHit[]; error?: string }>
    ) => {
      const call = pending.get(e.data.id)
      pending.delete(e.data.id)
      if (e.data.error) call?.reject(new Error(e.data.error))
      else call?.resolve(e.data.hits ?? [])
    }
  }
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    worker!.postMessage({ id, url: withBase(`/${SEMANTIC_INDEX_FILE}`), query })
  })
}

/** Downloads the embedder and index (once). */
export const loadSemanticSearch = () => request().then(() => undefined)

export const semanticSearch = (query: string) => request(query)
