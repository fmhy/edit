<script setup lang="ts">
import { useData, useRoute } from 'vitepress'
import { nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useLinkBookmarks } from '../composables/linkBookmarks'
import {
  extractRowFromLi,
  getMainLink,
  normalizeBookmarkUrl,
  normalizePagePath,
  resolveLinkHref
} from '../composables/savedRowUtils'
import { rememberPageRow } from '../composables/useSavedRowResolver'

const route = useRoute()
const { site } = useData()
const { bookmarks, isBookmarked, toggle, updateSnapshot } = useLinkBookmarks()

const MY_LIST_PATH = '/my-list'

let enhanceFrame = 0

function syncButtonState(button: HTMLButtonElement, url: string) {
  const saved = isBookmarked(url)
  button.classList.toggle('is-saved', saved)
  button.setAttribute('aria-pressed', saved ? 'true' : 'false')
  button.setAttribute(
    'aria-label',
    saved ? 'Remove bookmark' : 'Bookmark this link'
  )

  const label = button.querySelector('.link-bookmark-label')
  if (label) label.textContent = saved ? 'Bookmarked' : 'Bookmark'
}

function syncAllButtons() {
  document
    .querySelectorAll<HTMLButtonElement>('.link-bookmark-btn')
    .forEach((button) => {
      const url = button.dataset.url
      if (url) syncButtonState(button, url)
    })
}

function bookmarkFromLi(link: HTMLAnchorElement, li: HTMLLIElement) {
  const url = normalizeBookmarkUrl(resolveLinkHref(link))
  const page = normalizePagePath(route.path, site.value.base)
  const row = extractRowFromLi(li)
  const saved = toggle({
    url,
    page,
    html: row.html,
    classes: row.classes
  })

  if (saved) rememberPageRow(page, site.value.base, url, row)

  li.querySelectorAll<HTMLButtonElement>('.link-bookmark-btn').forEach(
    (button) => syncButtonState(button, url)
  )
}

function createBookmarkButton(
  link: HTMLAnchorElement,
  li: HTMLLIElement,
  href: string,
  inline = false
) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = inline
    ? 'link-bookmark-btn link-bookmark-btn--inline'
    : 'link-bookmark-btn'
  button.dataset.url = href
  button.innerHTML = inline
    ? '<span class="link-bookmark-icon" aria-hidden="true"></span>'
    : '<span class="link-bookmark-icon" aria-hidden="true"></span><span class="link-bookmark-label">Bookmark</span>'

  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    bookmarkFromLi(link, li)
  })

  syncButtonState(button, href)
  return button
}

function createTooltip(
  link: HTMLAnchorElement,
  li: HTMLLIElement,
  href: string
) {
  const tooltip = document.createElement('span')
  tooltip.className = 'fmhy-bookmark-tooltip'
  tooltip.setAttribute('role', 'tooltip')
  tooltip.appendChild(createBookmarkButton(link, li, href))
  return tooltip
}

function createInlineBookmark(
  link: HTMLAnchorElement,
  li: HTMLLIElement,
  href: string
) {
  const wrap = document.createElement('span')
  wrap.className = 'fmhy-bookmark-inline'
  wrap.append(' / ')
  wrap.appendChild(createBookmarkButton(link, li, href, true))
  return wrap
}

function unwrapEnhancedLinks(root: ParentNode) {
  root.querySelectorAll('.fmhy-bookmark-inline').forEach((el) => el.remove())
  root.querySelectorAll('.fmhy-link-wrap').forEach((wrap) => {
    const parent = wrap.parentNode
    if (!parent) return

    while (wrap.firstChild) {
      parent.insertBefore(wrap.firstChild, wrap)
    }
    parent.removeChild(wrap)
  })
}

function enhanceLink(link: HTMLAnchorElement, li: HTMLLIElement) {
  const href = normalizeBookmarkUrl(resolveLinkHref(link))
  if (!href) return

  if (!link.closest('.fmhy-link-wrap')) {
    const wrap = document.createElement('span')
    wrap.className = 'fmhy-link-wrap'

    link.parentNode?.insertBefore(wrap, link)
    wrap.appendChild(link)
    wrap.appendChild(createTooltip(link, li, href))
  }

  if (!li.querySelector('.fmhy-bookmark-inline')) {
    li.appendChild(createInlineBookmark(link, li, href))
  }
}

function enhanceLinks() {
  if (normalizePagePath(route.path, site.value.base) === MY_LIST_PATH) return

  const doc = document.querySelector('.VPDoc .content-container .vp-doc')
  if (!doc) return

  unwrapEnhancedLinks(doc)

  doc.querySelectorAll<HTMLLIElement>('li').forEach((li) => {
    const link = getMainLink(li)
    if (!link) return

    const url = normalizeBookmarkUrl(resolveLinkHref(link))
    if (isBookmarked(url)) {
      const row = extractRowFromLi(li)
      updateSnapshot(url, row)
      rememberPageRow(
        normalizePagePath(route.path, site.value.base),
        site.value.base,
        url,
        row
      )
    }

    enhanceLink(link, li)
  })
}

function scheduleEnhance() {
  cancelAnimationFrame(enhanceFrame)
  enhanceFrame = requestAnimationFrame(() => {
    nextTick(() => enhanceLinks())
  })
}

function onStorage(event: StorageEvent) {
  if (event.key === 'fmhy-saved-links') syncAllButtons()
}

onMounted(() => {
  scheduleEnhance()
  window.addEventListener('storage', onStorage)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(enhanceFrame)
  window.removeEventListener('storage', onStorage)
})

watch(
  () => route.path,
  () => scheduleEnhance()
)

watch(bookmarks, () => syncAllButtons(), { deep: true })
</script>

<template>
  <span hidden aria-hidden="true" />
</template>
