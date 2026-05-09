<script setup lang="ts">
import { useData } from 'vitepress'
import { ref, onMounted, onUnmounted, provide, nextTick } from 'vue'
import DefaultTheme from 'vitepress/theme'
import Announcement from './components/Announcement.vue'
import Sidebar from './components/SidebarCard.vue'
import Base64Dialog from './components/Base64Dialog.vue'
import { useTheme } from './themes/themeHandler'

const { isDark } = useData()
const { setMode } = useTheme()

const enableTransitions = () =>
  'startViewTransition' in document &&
  window.matchMedia('(prefers-reduced-motion: no-preference)').matches

provide('toggle-appearance', async ({ clientX: x, clientY: y }: MouseEvent) => {
  if (!enableTransitions()) {
    isDark.value = !isDark.value
    // Sync with theme handler
    setMode(isDark.value ? 'dark' : 'light')
    return
  }

  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${Math.hypot(
      Math.max(x, innerWidth - x),
      Math.max(y, innerHeight - y)
    )}px at ${x}px ${y}px)`
  ]

  await document.startViewTransition(async () => {
    isDark.value = !isDark.value
    // Sync with theme handler
    setMode(isDark.value ? 'dark' : 'light')
    await nextTick()
  }).ready

  document.documentElement.animate(
    { clipPath: isDark.value ? clipPath.reverse() : clipPath },
    {
      duration: 300,
      easing: 'ease-in',
      pseudoElement: `::view-transition-${isDark.value ? 'old' : 'new'}(root)`
    }
  )
})

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
      if (href.includes('https://rentry.co/FMHYB64') || href.startsWith('https://rentry.co/FMHYB64')) {
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

const updateMobileActiveLink = () => {
  if (window.innerWidth >= 1280) return
  
  const anchors = Array.from(document.querySelectorAll('.VPDoc h2, .VPDoc h3, .VPDoc h4'))
  let activeId = ''
  
  for (const anchor of anchors) {
    if (anchor.getBoundingClientRect().top < 120) {
      activeId = anchor.id
    } else {
      break
    }
  }
  
  const mobileLinks = document.querySelectorAll('.VPLocalNavOutlineDropdown .outline-link')
  mobileLinks.forEach(link => {
    const isMatch = link.getAttribute('href') === `#${activeId}`
    link.classList.toggle('active', isMatch)
  })
}

let tocObserver: MutationObserver | null = null

onMounted(() => {
  window.addEventListener('click', handleClick, { capture: true })
  window.addEventListener('scroll', updateMobileActiveLink, { passive: true })
  // Run once on mount to set initial state
  updateMobileActiveLink()

  // Refresh highlight as soon as the TOC menu is opened/added to DOM
  tocObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        const hasTOC = document.querySelector('.VPLocalNavOutlineDropdown .items')
        if (hasTOC) updateMobileActiveLink()
      }
    }
  })
  tocObserver.observe(document.body, { childList: true, subtree: true })
})

onUnmounted(() => {
  window.removeEventListener('click', handleClick, { capture: true })
  window.removeEventListener('scroll', updateMobileActiveLink)
  if (tocObserver) tocObserver.disconnect()
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
  <Base64Dialog :show="showBase64Dialog" :url="formattedUrl" @close="showBase64Dialog = false" />
</template>

<style>
::view-transition-old(root),
::view-transition-new(root) {
  animation: none;
  mix-blend-mode: normal;
}

::view-transition-old(root),
.dark::view-transition-new(root) {
  z-index: 1;
}

::view-transition-new(root),
.dark::view-transition-old(root) {
  z-index: 9999;
}

.VPSwitchAppearance {
  width: 22px !important;
}

.VPSwitchAppearance .check {
  transform: none !important;
}
</style>
