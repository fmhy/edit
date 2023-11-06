<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div tw="w-full h-full bg-black flex flex-col" style="background-image: url(https://files.catbox.moe/1f84dy.png)">
    <div tw="p-10 w-full min-h-0 grow flex flex-col items-center justify-between">
      <div tw="w-full flex justify-between items-center text-5xl font-medium">
        <div tw="text-zinc-100 ml-2 mt-1 font-semibold">freemediaheckyeah</div>
      </div>
      <div tw="w-full pr-56 flex flex-col items-start justify-end">
        <div tw="text-6xl font-bold text-stone-200" v-html="title" />
        <div tw="mt-2 text-4xl text-neutral-400" v-html="description" />
      </div>
    </div>
    <div tw="shrink-0 h-4 w-full flex" style="background-color: #7bc5e4" />
  </div>
</template>
