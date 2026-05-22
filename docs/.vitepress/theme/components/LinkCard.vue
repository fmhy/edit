<script setup lang="ts">
import { computed } from 'vue'
import Tag from './Tag.vue'

const props = defineProps<{
  title: string
  tags: string
  description: string
  href: string
  target?: string
}>()

const tags = computed(() => props.tags.split(','))
</script>

<template>
  <a class="link-card" :href :target>
    <div class="title">
      <div>{{ title }}</div>
      <div class="flex-grow" />
      <div class="flex gap-1">
        <Tag v-for="tag in tags" :key="tag" :text="tag" />
      </div>
    </div>
    <div class="description">
      {{ description }}
    </div>
  </a>
</template>

<style scoped>
.link-card {
  --uno: 'block my-4 pl-8 pr-6 py-6 rounded-lg bg-$vp-c-bg-soft flex flex-col gap-2';
  border: 2px solid var(--vp-c-bg-soft);
  transition:
    color 0.5s,
    background-color 0.5s;
  text-decoration: none;
}

.link-card:hover {
  border-color: var(--vp-c-brand-soft);
  transition: border-color 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.title {
  font-size: 18px;
  line-height: 1.4;
  letter-spacing: -0.02em;
  display: flex;
  color: var(--vp-c-brand-1);
}

.description {
  margin-bottom: 0;
  color: var(--vp-c-text-2);
  transition: color 0.5s;
}
</style>
