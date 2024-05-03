<script setup lang="ts">
// This script block defines the properties that will be passed to the component.
// The 'title' property is required, while 'description' is optional.
defineProps<{ title: string; description?: string }>()
</script>

<template>
  <!-- The root element is a div with a flex container and a black background.
  A background image is set using the 'style' attribute. -->
  <div
    tw="w-full h-full bg-black flex flex-col"
    style="background-image: url(https://fmhy.pages.dev/og.png)"
  >
    <!-- This div contains the main content of the component. It has padding,
    a minimum height, and is a flex container with items centered both vertically
    and horizontally. -->
    <div
      tw="p-10 w-full min-h-0 grow flex flex-col items-center justify-between"
    >
      <!-- This div contains the title section. It has a flex container with
      the 'freemediaheckyeah' text and an SVG icon. The SVG icon is not provided
      in the code, so it's assumed to be imported or defined elsewhere. -->
      <div tw="w-full flex justify-between items-center text-5xl font-medium">
        <div tw="flex items-center">
          <div tw="text-zinc-100 ml-2 mt-1 font-semibold">
            freemediaheckyeah
          </div>
          <!-- The SVG icon is represented by a commented-out div for demonstration purposes. -->
          <!-- <div tw="w-10 h-10 fill-current text-zinc-100">
            <svg viewBox="0 0 24 24">
              <!-- SVG path data would be placed here -->
            </svg>
          </div> -->
        </div>
      </div>
      <!-- This div contains the main content text. It has a right padding,
      and the text color is set to a light gray. -->
      <div tw="w-full pr-56 flex flex-col items-start justify-end">
        <!-- The 'title' prop is displayed using the 'v-html' directive, which
        allows for rendering HTML content. -->
        <div style="color: #f3f4f6" tw="text-6xl font-bold" v-html="title" />
        <!-- The 'description' prop is displayed similarly to the 'title' prop. -->
        <div style="color: #c0caf5" tw="mt-2 text-4xl" v-html="description" />
      </div>
    </div>
    <!-- This div is a thin horizontal bar at the bottom of the component.
    The background color is set to a light purple. -->
    <div tw="shrink-0 h-2 w-full flex" style="background-color: #c4b5fd" />
  </div>
</template>

