<script setup lang="ts">
defineProps<{
  title: string
  description: string
  mobile: string
  desktop: string
}>()
</script>

<template>
  <div class="bg-bg-elv text-text w-full max-w-md rounded-lg border shadow-sm">
    <div class="flex flex-col space-y-1.5 p-6 pb-4">
      <h4
        class="whitespace-nowrap text-2xl font-semibold leading-none tracking-tight"
      >
        {{ title }}
      </h4>
      <p class="text-text-2 text-sm font-medium leading-none tracking-tight">
        {{ description }}
      </p>
    </div>
    <div class="p-6">
      <img
        :src="desktop"
        :alt="title"
        class="aspect-[3/2] rounded-md object-cover"
        width="1080"
        height="1920"
      />
    </div>
    <div class="flex items-center gap-2 p-6">
      <a :href="mobile" target="_blank">Mobile</a>
      <span class="text-text-2">•</span>
      <a :href="desktop" target="_blank">Desktop</a>
    </div>
  </div>
</template>
