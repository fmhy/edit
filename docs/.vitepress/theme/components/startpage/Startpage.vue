<script setup lang="ts">
import Bookmarks from './Bookmarks.vue'
import Searchbar from './SearchBar.vue'

const isFocused = ref(false)
const handleFocusChange = (focused: boolean) => {
  isFocused.value = focused
}
</script>

<template>
  <div class="min-h-screen flex pt-48 justify-center p-4 transition-colors">
    <div class="w-full max-w-7xl space-y-8">
      <Searchbar @focus-change="handleFocusChange" />
      <Bookmarks :is-input-globally-focused="isFocused" />

      <div class="hidden sm:block space-y-2 text-sm text-text-2">
        <p>
          Press
          <kbd class="kbd">/</kbd>
          anywhere to focus the search box
        </p>
        <p>
          Use
          <kbd class="kbd">Alt + a/s/d/f</kbd>
          to search different platforms
        </p>
        <p>
          Type bookmark chords (like
          <kbd class="kbd px-1.5 py-0.5">H</kbd>
          <kbd class="kbd px-1.5 py-0.5">N</kbd>
          for Hacker News) when search is not focused
        </p>
        <p>
          Press
          <kbd class="kbd">Enter</kbd>
          to search SearXNG (hosted by us) by default
        </p>
      </div>
    </div>
  </div>
</template>

<style>
kbd {
  --uno: px-1.5 py-0.5 rounded-sm font-sans font-semibold text-xs bg-bg-alt
    text-text-2 border-2 border-div nowrap;
}
</style>
