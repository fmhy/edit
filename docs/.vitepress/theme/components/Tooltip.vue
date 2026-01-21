<!--
  All Rights Reserved

  Copyright (c) 2025 taskylizard

  All rights reserved. This code and its associated files may not be copied, modified, distributed, sublicensed, or used in any form, in whole or in part, without prior written permission from the copyright holder.
-->
<script setup lang="ts">
import { ref } from 'vue'

const isOpen = ref(false)

withDefaults(
  defineProps<{
    title: string
    icon: string
  }>(),
  {
    title: 'Info',
    // https://icon-sets.iconify.design/material-symbols/
    icon: 'i-material-symbols-help'
  }
)
</script>

<template>
  <VTooltip theme="vp-tooltip" @show="isOpen = true" @hide="isOpen = false">
    <button
      aria-label="Tooltip"
      :class="[
        'text-brand-1 inline-flex size-5 align-middle items-center justify-center leading-none p-0 select-none font-bold cursor-pointer transition-all size-[1em] translate-y-[4px]',
        isOpen && 'tooltip-open-glow'
      ]"
    >
      <div :class="[icon, 'size-full']" />
    </button>

    <template #popper>
      <div class="border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 max-w-md max-h-md border-2 border-solid p-4 transition-all">
        <h3
          class="text-$vp-c-text-1 mb-2 text-lg font-semibold"
          v-text="title"
        />
        <div class="text-$vp-c-text-2 text-sm content">
          <slot />
        </div>
      </div>
    </template>
  </VTooltip>
</template>

<style>
.v-popper__popper {
  --uno: z-9999;
}

.v-popper {
  display: inline-flex !important;
}

.v-popper__popper .content ol {
  list-style: decimal !important;
}

.v-popper__popper .content ul {
  --uno: ml-4;
  color: var(--vp-c-text-2);
  list-style: disc !important;
}

.v-popper__popper .content table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  --uno: text-sm;
}

.v-popper__popper .content thead th {
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-weight: 600;
  padding: 6px 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.v-popper__popper .content tbody td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.tooltip-open-glow {
  filter: drop-shadow(0 0 6px currentColor) drop-shadow(0 0 12px currentColor);
  transition: filter 0.2s ease;
}
</style>
