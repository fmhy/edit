<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    src: string
  }>(),
  { title: 'YouTube video frame' }
)
</script>

<template>
  <iframe
    class="aspect-16/9 rounded-xl w-full shadow-md border-none"
    :src="src"
    :title="title"
    frameborder="0"
    allow="
      accelerometer;
      autoplay;
      clipboard-write;
      encrypted-media;
      gyroscope;
      picture-in-picture;
    "
    allowfullscreen
  ></iframe>
</template>
