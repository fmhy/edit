// Loads the Ternlight embedder + semantic index on first use and answers
// queries off the main thread. Messages: { id, url, query? } -> { id, hits?, error? }

import type { SemanticIndex } from './semantic'
import initEmbedder, { embed } from '@ternlight/base/web'
import {
  decodeSemanticIndex,
  normalizeEmbedText,
  scoreSemantic
} from './semantic'

const scope = self as unknown as Worker
let ready: Promise<SemanticIndex> | null = null

function load(url: string) {
  ready ??= Promise.all([
    initEmbedder(),
    fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
      return res.arrayBuffer()
    })
  ]).then(([, buffer]) => decodeSemanticIndex(buffer))
  return ready
}

scope.onmessage = async (
  e: MessageEvent<{ id: number; url: string; query?: string }>
) => {
  const { id, url, query } = e.data
  try {
    const index = await load(url)
    const hits =
      query === undefined
        ? []
        : scoreSemantic(index, embed(normalizeEmbedText(query)))
    scope.postMessage({ id, hits })
  } catch (error) {
    ready = null
    scope.postMessage({ id, error: String(error) })
  }
}
