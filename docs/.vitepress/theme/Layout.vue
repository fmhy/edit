<script setup lang="ts">
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import Announcement from './components/Announcement.vue'
import Base64Dialog from './components/Base64Dialog.vue'
import Sidebar from './components/SidebarCard.vue'

const { Layout } = DefaultTheme
const showBase64Dialog = ref(false)
const formattedUrl = ref('')

const handleClick = (e: MouseEvent) => {
  // Check if the clicked element is a link or within a link
  const target = e.target as HTMLElement
  const link = target.closest ? target.closest('a') : null

  if (link) {
    const href = (link as HTMLAnchorElement).href

    if (typeof href === 'string') {
      if (
        href.includes('https://rentry.co/FMHYB64') ||
        href.startsWith('https://rentry.co/FMHYB64')
      ) {
        const dontShow = localStorage.getItem('fmhy-base64-dialog-preference')
        if (dontShow === 'true') {
          return // Let the link click proceed normally
        }

        e.preventDefault()
        e.stopPropagation()
        formattedUrl.value = href
        showBase64Dialog.value = true
      }
    }
  }
}

// Anchors are stable for the lifetime of a page; invalidate on route change.
let cachedAnchors: HTMLElement[] | null = null
let scheduledUpdate = false

const runUpdateMobileActiveLink = () => {
  if (window.innerWidth >= 1280) return

  if (!cachedAnchors) {
    cachedAnchors = Array.from(
      document.querySelectorAll<HTMLElement>('.VPDoc h2, .VPDoc h3, .VPDoc h4')
    )
  }

  let activeId = ''
  for (const anchor of cachedAnchors) {
    if (anchor.getBoundingClientRect().top < 120) {
      activeId = anchor.id
    } else {
      break
    }
  }

  const mobileLinks = document.querySelectorAll(
    '.VPLocalNavOutlineDropdown .outline-link'
  )
  mobileLinks.forEach((link) => {
    const isMatch = link.getAttribute('href') === `#${activeId}`
    link.classList.toggle('active', isMatch)
  })
}

// rAF-throttle so rapid scroll events collapse into one update per frame
// and DOM reads happen in the same phase as paint (no layout thrash).
const scheduleMobileLinkUpdate = () => {
  if (scheduledUpdate) return
  scheduledUpdate = true
  requestAnimationFrame(() => {
    scheduledUpdate = false
    runUpdateMobileActiveLink()
  })
}

// Clicking the local-nav button opens the TOC dropdown; rAF defers the
// update until Vue has mounted the new items.
const handleAnyClick = () => requestAnimationFrame(scheduleMobileLinkUpdate)

const route = useRoute()
watch(
  () => route.path,
  () => {
    cachedAnchors = null
    scheduleMobileLinkUpdate()
  }
)

onMounted(() => {
  window.addEventListener('click', handleClick, { capture: true })
  window.addEventListener('scroll', scheduleMobileLinkUpdate, { passive: true })
  window.addEventListener('click', handleAnyClick, { passive: true })
  scheduleMobileLinkUpdate()
})

onUnmounted(() => {
  window.removeEventListener('click', handleClick, { capture: true })
  window.removeEventListener('scroll', scheduleMobileLinkUpdate)
  window.removeEventListener('click', handleAnyClick)
})
</script>

<template>
  <Layout>
    <template #sidebar-nav-after>
      <Sidebar />
    </template>
    <template #home-hero-info-before>
      <Announcement />
    </template>
    <template #home-features-before>
      <p class="text-center text-lg text-text-2 mb-2">
        Or browse these pages
        <span class="inline-block i-twemoji:sparkles" />
      </p>
    </template>
    <Content />
  </Layout>
  <Base64Dialog
    :show="showBase64Dialog"
    :url="formattedUrl"
    @close="showBase64Dialog = false"
  />
</template>

<style>
/* The reveal is driven entirely by the JS clip-path animation in
   revealThemeChange, so disable the default crossfade on both snapshots. */
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

/* Layer the snapshots so the one being clipped sits on top:
   - switching to light, the new (light) layer grows on top;
   - switching to dark (.dark), the old (light) layer shrinks on top. */
::view-transition-old(root),
.dark::view-transition-new(root) {
  z-index: 1;
}

::view-transition-new(root),
.dark::view-transition-old(root) {
  z-index: 9999;
}

/* When transitioning to light mode (not .dark), initialize the new snapshot
   as fully clipped (circle(0px)) to prevent it flashing fully visible
   before the JS animation runs. */
html:not(.dark)::view-transition-new(root) {
  clip-path: circle(0px);
}
</style>
