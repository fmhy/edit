<!-- eslint-disable vue/require-v-for-key -->
<script setup lang="ts">
// Import the 'data' object from './posts.data' and rename it to 'posts'
import { data as posts } from './posts.data'

// Define a function to format a given date string into a more readable format
const formatDate = (raw: string): string => {
  // Create a new Date object using the raw date string
  const date = new Date(raw)

  // Return the formatted date string using the toLocaleDateString method
  // with the specified locale and options
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <!-- Wrap the content in a div element -->
  <div>
    <!-- Section element containing the title and a description -->
    <section>
      <!-- Flex container for the title and a class for styling -->
      <h1 class="flex items-center gap-2">Posts</h1>
      <!-- Description of the posts section -->
      <p>Everything from Monthly Updates to fmhy updates.</p>

      <!-- Anchor element for the RSS feed with a link and target attributes -->
      <a href="/feed.rss" target="_blank" title="RSS feed">
        <!-- Carbon-RSS icon element -->
        <div class="i-carbon-rss vertical-top" />
        <!-- Text for the RSS feed link -->
        RSS feed.
      </a>
    </section>

    <!-- Template element for iterating over the years and posts -->
    <template v-for="year in Object.keys(posts).reverse()" :key="year">
      <!-- Heading element for the year -->
      <h2>{{ year }}</h2>
      <!-- Unordered list element for the posts of the current year -->
      <ul>
        <!-- Loop through the posts of the current year -->
        <li v-for="post of posts[year]" :key="post.url">
          <!-- Article element for each post -->
          <article>
            <!-- Anchor element for the post link -->
            <a :href="post.url" class="border-none">{{ post.title }}</a>
            <!-- Dash element separating the title and date -->
            -
            <!-- Description list element for the post metadata -->
            <dl class="m-0 inline">
              <!-- Term element for the published on text -->
              <dt class="sr-only">Published on</dt>
              <!-- Description element for the formatted post date -->
              <dd class="m-0 inline">
                <!-- Time element for the post date with the raw date string as the datetime attribute -->
                <time :datetime="post.date" class="font-bold">
                  <!-- Formatted post date using the formatDate function -->
                  {{ formatDate(post.date) }}
                </time>
              </dd>
            </dl>
          </article>
        </li>
      </ul>
    </template>
  </div>
</template>

<!-- Scoped style block for the component -->
<style scoped>
.VPBadge {
  border: 1px solid transparent;
  border-radius: 8px;
  display: inline-flex;
  margin-left: 2px;
  padding: 0 10px;
  line-height: 22px;
  font-size: 12px;
  font-weight: 500;
  transform: translateY(-2px);
  align-items: center;
  gap: 0.2rem;
  padding-right: 10px;
  vertical-align: middle;
  color: var(--vp-badge-tip-text);
  background-color: transparent;
  border-color: var(--vp-custom-block-tip-outline);
}
</style>
