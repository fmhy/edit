<script setup lang="ts">
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <div
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
    <div
      tw="p-10 w-full min-h-0 grow flex flex-col items-center justify-between"
    >
      <div tw="w-full flex justify-between items-center text-5xl font-medium">
        <div tw="flex items-center">
          <div tw="text-zinc-100 ml-2 mt-1 font-semibold">
            freemediaheckyeah
          </div>
        </div>
      </div>
      <div tw="w-full pr-56 flex flex-col items-start justify-end">
        <div style="color: #f3f4f6" tw="text-6xl font-bold" v-html="title" />
        <div style="color: #c0caf5" tw="mt-2 text-4xl" v-html="description" />
      </div>
    </div>
  </div>
</template>
