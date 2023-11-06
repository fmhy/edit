<script setup lang="ts">
defineProps<{ title: string; description?: string; dir?: string }>();
</script>

<template>
  <div
    tw="w-full h-full bg-black flex flex-col"
    style="background-image: url(https://files.catbox.moe/1f84dy.png)">
    <div tw="p-10 w-full min-h-0 grow flex flex-col items-center justify-between">
      <div tw="w-full flex justify-between items-center text-5xl font-medium">
        <div tw="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 256 256">
            <path
              fill="#f3f4f6"
              d="M240 128a15.74 15.74 0 0 1-7.6 13.51L88.32 229.65a16 16 0 0 1-16.2.3A15.86 15.86 0 0 1 64 216.13V39.87a15.86 15.86 0 0 1 8.12-13.82a16 16 0 0 1 16.2.3l144.08 88.14A15.74 15.74 0 0 1 240 128Z" />
          </svg>
          <div tw="text-zinc-100 ml-2 mt-1 font-semibold">freemediaheckyeah</div>
        </div>
        <div tw="flex items-center text-zinc-300">
          <div tw="text-4xl font-semibold mr-2" v-html="dir" />
        </div>
      </div>
      <div tw="w-full pr-56 flex flex-col items-start justify-end">
        <div tw="text-6xl font-bold text-stone-200" v-html="title" />
        <div v-if="description" tw="mt-2 text-4xl text-neutral-400" v-html="description" />
      </div>
    </div>
    <div tw="shrink-0 h-4 w-full flex" style="background-color: #7bc5e4" />
  </div>
</template>
