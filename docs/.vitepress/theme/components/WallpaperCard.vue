<script setup lang="ts">
defineProps<{
  title: string
  description: string
  mobile: string
  desktop: string
}>()
</script>

<template>
  <div
    class="rounded-lg border bg-bg-elv text-text shadow-sm w-full max-w-md"
    data-v0-t="card"
  >
    <div class="flex flex-col space-y-1.5 p-6 pb-4">
      <h4
        class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight"
      >
        {{ title }}
      </h4>
      <p class="text-sm font-medium leading-none tracking-tight">
        {{ description }}
      </p>
    </div>
    <div class="p-6">
      <img
        :src="desktop"
        :alt="title"
        class="rounded-md object-cover aspect-[3/2]"
        width="600"
        height="400"
      />
    </div>
    <div class="items-center p-6 flex gap-4">
      <a :href="mobile" target="_blank">Mobile</a>
      <span class="">•</span>
      <a :href="desktop" target="_blank">Desktop</a>
    </div>
  </div>
</template>
