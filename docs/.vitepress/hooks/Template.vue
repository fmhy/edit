<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <span
    tw="w-full h-full bg-black flex flex-col"
    style="
      background-image: linear-gradient(
        43deg,
        #b794f4 2%,
        #b18df2 7.5%,
        #ab87ef 13%,
        #9f7aea 24%,
        #8c6ee2 32%,
        #7864d8 40%,
        #4c51bf 56%,
        #4949ae 60.5%,
        #46419b 65%,
        #3c366b 74%,
        #2f315d 80.5%,
        #272d47 87%,
        #1a202c 100%
      );
    "
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
