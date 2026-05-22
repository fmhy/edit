<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    variant?: 'default' | 'thin'
    link?: string
    title: string
    tag: string
    description: string
    theme: string
  }>(),
  {
    variant: 'default',
    link: undefined
  }
)

const theme = computed(() => {
  return {
    title: `text-${props.theme}-100`,
    bgleft: `bg-${props.theme}-800`,
    bgright: `bg-${props.theme}-700`,
    link: `text-${props.theme}-300`,
    description: `text-${props.theme}-100`,
    tag: `text-${props.theme}-300`
  }
})

const classes = computed(() => {
  if (props.variant === 'thin') {
    return {
      container: 'h-40 text-sm',
      bgleft: 'h-40 w-40 blur-2xl -left-20',
      bgright: 'h-60 w-60 blur-2xl -top-24',
      title: 'text-3xl',
      icon: 'top-12 left-4',
      description: 'mt-2 text-sm'
    }
  } else {
    return {
      container: 'h-96',
      bgleft: 'h-80 w-80 blur-3xl -left-32',
      bgright: 'h-96 w-96 blur-3xl -top-56',
      title: 'text-6xl',
      icon: 'top-36 left-6',
      description: 'mt-4'
    }
  }
})
</script>

<template>
  <div
    style="box-shadow: 0 10px 40px -12px rgba(16, 24, 40, 0.1)"
    :class="classes.container"
    class="rounded-2xl border border-amber overflow-hidden flex flex-col relative text-color bg-zinc-900"
  >
    <div class="p-4 sticky top-0 z-10">
      <div class="flex items-center gap-1.5">
        <div :class="theme.tag" class="font-medium">
          {{ props.tag }}
        </div>
      </div>
    </div>
    <div
      :class="`${theme.bgleft} ${classes.bgleft} absolute top-1/3 -translate-y-1/2 rounded-full mix-blend`"
    ></div>
    <div
      :class="`${theme.bgright} ${classes.bgright} absolute left-1/2 -translate-x-1/2 rounded-full mix-blend`"
    ></div>
    <div :class="`absolute ${classes.icon}`">
      <div class="flex items-start">
        <div
          :class="classes.title"
          class="font-normal tracking-tighter text-color-50"
        >
          {{ props.title }}
        </div>
        <a v-if="props.link" :href="props.link" target="_blank">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            :class="theme.link"
            class="w-8 h-8 ml-3"
          >
            <path
              fill-rule="evenodd"
              d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
              clip-rule="evenodd"
            ></path>
          </svg>
        </a>
      </div>
      <div
        :class="`text-color-muted ${theme.description} ${classes.description}`"
      >
        {{ description }}
      </div>
    </div>
  </div>
</template>
