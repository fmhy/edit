<script setup lang="ts">
defineProps<{
  text: string
  href: string
  target?: string
}>()
</script>

<template>
  <a
    :href
    :target
    class="bg-$vp-c-default-soft hover:bg-$vp-c-brand-soft rounded px2 py1 !decoration-none"
  >
    {{ text }}
  </a>
</template>
