export interface ServiceExtraLink {
  label: string
  href: string
}

export interface ServiceExtraGroup {
  title: string
  items: ServiceExtraLink[]
  contentText: string
}

export interface ServiceExtraEntry {
  serviceName: string
  groups: ServiceExtraGroup[]
  searchText: string
}

export interface ServiceExtrasResult {
  markdown: string
  entries: ServiceExtraEntry[]
}

const EXTRA_SUFFIXES = ['tools', 'resources', 'extensions', 'addons', 'add-ons', 'ports']
const GENERIC_TRAILING_WORDS = ['studio', 'client', 'official']
const LIST_ITEM_RE = /^[*-] (.+)$/
const TITLE_BODY_SEPARATOR = ' - '

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
}

export function toPlainText(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/:[\w-]+:/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function buildTrigger(entry: ServiceExtraEntry): string {
  const payload = escapeAttribute(encodeServiceExtraEntry(entry))
  return `<ServiceExtras payload="${payload}" />`
}

export function parseServiceLine(content: string) {
  const normalizedContent = content.replace(/^:[\w-]+:\s+/, '').trim()
  const separatorIndex = normalizedContent.indexOf(TITLE_BODY_SEPARATOR)
  if (separatorIndex === -1) return

  const titlePart = normalizedContent.slice(0, separatorIndex).trim()
  const body = normalizedContent.slice(separatorIndex + TITLE_BODY_SEPARATOR.length).trim()
  const titlePlain = toPlainText(titlePart)
  const primaryLabel = titlePlain
    .split(/\s+or\s+|,\s*|\s*\/\s*/i)[0]
    ?.trim()

  if (!titlePlain || !primaryLabel || !body) return

  return {
    titlePlain,
    primaryLabel,
    body
  }
}

function parseListItem(line: string) {
  const match = line.match(LIST_ITEM_RE)
  if (!match) return

  const content = match[1]
  return parseServiceLine(content)
}

export function createServiceExtraEntry(
  current: { primaryLabel: string },
  groups: ServiceExtraGroup[]
): ServiceExtraEntry {
  const searchText = groups
    .map((group) => `${group.title} ${group.contentText}`)
    .join(' ')
    .trim()

  return {
    serviceName: current.primaryLabel,
    groups,
    searchText
  }
}

export function parseExtraItems(body: string): ServiceExtraLink[] {
  const items: ServiceExtraLink[] = []

  for (const match of body.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
    const suffixMatch = body.slice(match.index! + match[0].length).match(/^\s*(\([^)]*\))/)
    const suffix = suffixMatch?.[1] ? ` ${suffixMatch[1]}` : ''

    items.push({
      label: `${match[1]}${suffix}`.trim(),
      href: match[2]
    })
  }

  return items
}

export function isCompanionTitle(title: string, serviceName: string): boolean {
  const normalizedTitle = normalize(title)
  const normalizedService = normalizeAlias(serviceName)

  if (!normalizedTitle || !normalizedService) return false
  if (normalizedTitle === 'reportissues') return true

  const baseTitle = stripExtraSuffix(title)
  const normalizedBase = baseTitle ? normalizeAlias(baseTitle) : ''
  if (!normalizedBase) return false

  return (
    normalizedBase === normalizedService ||
    normalizedBase.startsWith(normalizedService) ||
    normalizedService.startsWith(normalizedBase)
  )
}

export function encodeServiceExtraEntry(entry: ServiceExtraEntry): string {
  return encodeURIComponent(JSON.stringify(entry))
}

export function attachServiceExtras(text: string): ServiceExtrasResult {
  const lines = text.split('\n')
  const output: string[] = []
  const entries: ServiceExtraEntry[] = []

  for (let index = 0; index < lines.length; index++) {
    const currentLine = lines[index]
    const currentItem = parseListItem(currentLine)

    if (!currentItem) {
      output.push(currentLine)
      continue
    }

    const groups: ServiceExtraGroup[] = []
    let nextIndex = index + 1

    while (nextIndex < lines.length) {
      const nextItem = parseListItem(lines[nextIndex])
      if (!nextItem || !isCompanionTitle(nextItem.titlePlain, currentItem.primaryLabel)) {
        break
      }

      const items = parseExtraItems(nextItem.body)
      if (!items.length) {
        break
      }

      groups.push({
        title: nextItem.titlePlain,
        items,
        contentText: toPlainText(nextItem.body)
      })
      nextIndex++
    }

    if (!groups.length) {
      output.push(currentLine)
      continue
    }

    const entry = createServiceExtraEntry(currentItem, groups)

    entries.push(entry)
    output.push(`${currentLine} ${buildTrigger(entry)}`)
    index = nextIndex - 1
  }

  return {
    markdown: output.join('\n'),
    entries
  }
}

function normalizeAlias(value: string): string {
  let normalizedValue = value.trim()

  for (const word of GENERIC_TRAILING_WORDS) {
    const suffix = new RegExp(`\\s+${escapeRegExp(word)}$`, 'i')
    normalizedValue = normalizedValue.replace(suffix, '').trim()
  }

  return normalize(normalizedValue)
}

function stripExtraSuffix(title: string): string | null {
  const trimmedTitle = title.trim()

  for (const suffix of EXTRA_SUFFIXES) {
    const suffixPattern = new RegExp(`\\s+${escapeRegExp(suffix)}$`, 'i')
    if (suffixPattern.test(trimmedTitle)) {
      return trimmedTitle.replace(suffixPattern, '').trim()
    }
  }

  return null
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
