import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MAPPING, validateMapping } from '../scripts/sync-beginners-guide.js'

test('beginners guide sync mapping resolves against the wiki sources', () => {
  const summary = validateMapping()
  assert.equal(summary.blocks, MAPPING.length)
  assert.equal(
    summary.bullets,
    MAPPING.reduce((total, block) => total + block.bullets.length, 0)
  )
  assert.ok(summary.picks > 0)
})
