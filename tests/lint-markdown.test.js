import assert from 'node:assert/strict'
import { execFile as execFileCallback } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { describe, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFile = promisify(execFileCallback)
const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const LINTER_PATH = path.join(ROOT_DIR, 'scripts/lint-markdown.js')

async function runLinter(markdown) {
  const dir = await mkdtemp(path.join(tmpdir(), 'fmhy-lint-'))
  const file = path.join(dir, 'sample.md')
  await writeFile(file, markdown, 'utf8')

  try {
    const { stdout } = await execFile(process.execPath, [LINTER_PATH, file], {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' }
    })
    return { exitCode: 0, output: stdout }
  } catch (error) {
    return {
      exitCode: typeof error.code === 'number' ? error.code : 1,
      output: `${error.stdout ?? ''}${error.stderr ?? ''}`
    }
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/**
 * Data-driven scenarios for scripts/lint-markdown.js.
 * Set `expected` to a substring of the expected diagnostic, or `null` when
 * the input must pass with zero issues.
 */
const scenarios = [
  // Punctuation & spacing
  {
    name: 'detects double spaces in line text',
    input: '* [Example](https://example.com) - Double  space',
    expected: 'Double space detected'
  },
  {
    name: 'ignores leading list indentation',
    input: '  * [Example](https://example.com) - Indented sub-item',
    expected: null
  },
  {
    name: 'detects missing space after slash',
    input: '* [Example](https://example.com) - Fast /Reliable',
    expected: 'Missing space after slash'
  },
  {
    name: 'allows shorthand slashes and numeric ratios',
    input: '* [Example](https://example.com) - Compatible w/ Windows 10/11',
    expected: null
  },

  // Articles, repeated words & spelling
  {
    name: 'detects incorrect "a" before vowel sound',
    input: '* [Example](https://example.com) - Install a adblocker',
    expected: 'Incorrect article "a" usage'
  },
  {
    name: 'detects incorrect "an" before consonant sound',
    input: '* [Example](https://example.com) - Install an user script',
    expected: 'Incorrect article "an" usage'
  },
  {
    name: 'allows "an" before vowel-sounding acronym and phonetic exceptions',
    input:
      '* [Example](https://example.com) - Subscribe to an [RSS](https://example.com) feed in an hour for a unique user',
    expected: null
  },
  {
    name: 'detects repeated words',
    input: '* [Example](https://example.com) - The the tool',
    expected: 'Repeated word detected'
  },
  {
    name: 'allows allowlisted repeated project names like Puyo Puyo',
    input: '* [Puyo Puyo](https://example.com) - Classic puzzle game',
    expected: null
  },
  {
    name: 'detects common typos in prose',
    input: '* [Example](https://example.com) - Teh best tool',
    expected: 'Possible typo: "Teh"'
  },
  {
    name: 'ignores typo substrings inside URLs',
    input: '* [Example](https://example.com/teh) - Valid tool',
    expected: null
  },

  // Markdown links & destinations
  {
    name: 'detects space between bracket and parenthesis',
    input: '* [Example] (https://example.com)',
    expected: 'Space between bracket and parenthesis in link'
  },
  {
    name: 'detects missing closing bracket in link',
    input: '* [Example(https://example.com)',
    expected: 'Possible missing closing bracket "]"'
  },
  {
    name: 'detects missing closing parenthesis in link',
    input: '* [Example](https://example.com - Broken link',
    expected: 'Possible broken link'
  },
  {
    name: 'detects unbalanced double closing parenthesis',
    input: '* [Example](https://example.com))',
    expected: 'Double closing parenthesis in link (Unbalanced)'
  },
  {
    name: 'allows balanced link inside outer parentheses',
    input:
      '* [Example](https://example.com) - Info (See [Docs](https://docs.example.com))',
    expected: null
  },
  {
    name: 'detects empty link destination',
    input: '* [Example]()',
    expected: 'Empty link destination'
  },
  {
    name: 'detects missing local link target',
    input: '* [Missing](./does-not-exist.md)',
    expected: 'Local link or asset target does not exist'
  },
  {
    name: 'allows existing wiki root-relative links',
    input: '* [Audio](/audio#spotify-tools) - Music tools',
    expected: null
  },

  // Link labels & adjacent links
  {
    name: 'detects Discord label pointing to unrelated domain',
    input: '* [Discord](https://example.com/community)',
    expected: 'Link label mismatch: Label "Discord"'
  },
  {
    name: 'allows Discord label with a known redirect URL',
    input: '* [Discord](https://ascendara.app/discord)',
    expected: null
  },
  {
    name: 'rejects Discord label with an unknown /discord redirect URL',
    input: '* [Discord](https://example.com/discord)',
    expected: 'Link label mismatch: Label "Discord"'
  },
  {
    name: 'detects GitHub label pointing to GitLab',
    input: '* [GitHub](https://gitlab.com/user/repo)',
    expected: 'Link label mismatch: Label "GitHub"'
  },
  {
    name: 'detects adjacent links without separator',
    input: '* [One](https://one.example) [Two](https://two.example)',
    expected: 'Missing separator before link'
  },
  {
    name: 'allows adjacent links joined by slash or "or"',
    input:
      '* [One](https://one.example) / [Two](https://two.example) or [Three](https://three.example)',
    expected: null
  },

  // Formatting, code fences, duplicates & hierarchy
  {
    name: 'detects unbolded starred link',
    input: '* ⭐ [Unbolded](https://example.com)',
    expected: 'Starred link not bolded'
  },
  {
    name: 'detects unclosed bold tags',
    input: '* **Unclosed bold',
    expected: 'Unclosed or broken bold syntax'
  },
  {
    name: 'ignores bold syntax and typos inside code blocks and frontmatter',
    input: [
      '---',
      'title: Sample',
      '---',
      '',
      '* Uses `**` in inline code',
      '',
      '```md',
      '* [Example](https://example.com) - teh  a adblocker',
      '```'
    ].join('\n'),
    expected: null
  },
  {
    name: 'detects duplicate headings in the same parent section',
    input: '## Tools\n\n## Tools',
    expected: 'Duplicate heading in the same parent section'
  },
  {
    name: 'allows matching subheading names under different parent sections',
    input: '## Section A\n### Mirrors\n\n## Section B\n### Mirrors',
    expected: null
  },
  {
    name: 'detects duplicate primary URLs in the same section ignoring utm params',
    input: [
      '## Sites',
      '* [Tool](https://example.com/?utm_source=fmhy)',
      '* [Tool](https://example.com/)'
    ].join('\n'),
    expected: 'Duplicate primary resource URL in the same section'
  },
  {
    name: 'detects duplicate descriptions within a single entry',
    input: '* [Tool](https://example.com) - Open Source / Free / Open Source',
    expected: 'Duplicate description detected'
  },
  {
    name: 'detects hierarchy order violation in catalog block',
    input: [
      '* [Regular](https://one.example)',
      '* ⭐ **[Starred](https://two.example)**'
    ].join('\n'),
    expected: 'Hierarchy violation'
  },
  {
    name: 'allows valid catalog hierarchy order',
    input: [
      '* 🌐 **[Index](https://one.example)**',
      '* ↪️ **[Redirect](https://two.example)**',
      '* 🌟 **[Superstar](https://three.example)**',
      '* ⭐ **[Starred](https://four.example)**',
      '* [Regular](https://five.example)'
    ].join('\n'),
    expected: null
  }
]

describe('scripts/lint-markdown.js', { concurrency: true }, () => {
  for (const scenario of scenarios) {
    test(scenario.name, async () => {
      const result = await runLinter(scenario.input)

      if (scenario.expected === null) {
        assert.equal(
          result.exitCode,
          0,
          `Expected no lint errors, got:\n${result.output}`
        )
      } else {
        assert.notEqual(
          result.exitCode,
          0,
          `Expected lint failure matching "${scenario.expected}", but linter exited 0`
        )
        assert.ok(
          result.output.includes(scenario.expected),
          `Expected output to include "${scenario.expected}", got:\n${result.output}`
        )
      }
    })
  }
})
