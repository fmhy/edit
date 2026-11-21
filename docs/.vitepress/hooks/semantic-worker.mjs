// Embeds batches of texts for hooks/semantic.ts on a worker thread.

import { parentPort } from 'node:worker_threads'
import { embed } from '@ternlight/base'

parentPort.on('message', ({ id, texts }) => {
  const out = new Float32Array(texts.length * 384)
  texts.forEach((text, i) => out.set(embed(text), i * 384))
  parentPort.postMessage({ id, out }, [out.buffer])
})
