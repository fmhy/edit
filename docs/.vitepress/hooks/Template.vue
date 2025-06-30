<script setup lang="ts">
defineProps<{ title: string; description?: string; image?: string }>()
</script>

<template>
  <span
    tw="w-full h-full bg-black flex flex-col"
    :style="{
      backgroundImage: `url(${image})`
    }"
  >
    <span
      tw="p-10 w-full min-h-0 grow flex flex-col items-center justify-between"
    >
      <span tw="w-full flex justify-between items-center text-5xl font-medium">
        <span tw="flex items-center">
          <span tw="text-zinc-100 ml-2 mt-1 font-semibold">
            freemediaheckyeah
          </span>
        </span>
      </span>
      <span tw="w-full pr-56 flex flex-col items-start justify-end">
        <span style="color: #f3f4f6" tw="text-6xl font-bold" v-html="title" />
        <span style="color: #c0caf5" tw="mt-2 text-4xl" v-html="description" />
      </span>
    </span>
  </span>
</template>
