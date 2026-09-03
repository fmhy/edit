<script setup lang="ts">
import { computed } from 'vue'
import { themeRegistry } from '../themes/configs'
import { useTheme } from '../themes/themeHandler'

const { themeName } = useTheme()

const currentDisplayName = computed(
  () => themeRegistry[themeName.value]?.displayName ?? 'Default'
)
</script>

<template>
  <div>
    <div class="text-sm text-$vp-c-text-2">
      <span class="font-medium">Theme:</span>
      <span class="ml-1">{{ currentDisplayName }}</span>
    </div>
  </div>
</template>
