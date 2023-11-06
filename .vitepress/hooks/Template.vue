<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<template>
  <div tw="w-full h-full bg-black flex flex-col" style="background-image: url(https://files.catbox.moe/1f84dy.png)">
    <div tw="p-10 w-full min-h-0 grow flex flex-col items-center justify-between">
      <div tw="w-full flex justify-between items-center text-5xl font-medium">
        <div tw="flex items-center">
          <div tw="text-zinc-100 ml-2 mt-1 font-semibold">freemediaheckyeah</div>
        </div>
        <div tw="flex items-center text-zinc-300">
          <svg height="48" width="48" viewBox="0 -960 960 960" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M831-327.5V-558L516-386.5q-17 9-36 9t-36-9l-329.5-180q-10-5.5-14.5-14.25t-4.5-18.75q0-10 4.5-18.75t14.5-14.25l330-179.5q8.5-5 17.25-7t18.25-2q9.5 0 18.25 2t17.25 7l371 202q9 5 14.25 13.75T906-577v249.5q0 15.5-11 26.5t-26.5 11q-15.5 0-26.5-11t-11-26.5Zm-387 173-197-107q-18.5-10-28.75-27.75T208-328v-149.5L444-349q17 9 36 9t36-9l236-128.5V-328q0 21-10.25 38.75T713-261.5l-197 107q-8.5 5-17.5 7t-18.5 2q-9.5 0-18.5-2t-17.5-7Z" />
          </svg>
        </div>
      </div>
      <div tw="w-full pr-56 flex flex-col items-start justify-end">
        <div tw="text-6xl font-bold text-stone-200" v-html="title" />
        <div style="background-color: #f3f4f6" tw="mt-2 text-4xl" v-html="description" />
      </div>
    </div>
    <div tw="shrink-0 h-4 w-full flex" style="background-color: #7bc5e4" />
  </div>
</template>
