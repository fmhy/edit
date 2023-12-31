<script setup lang="ts">
import { useData } from "vitepress";
import Authors from "./components/Authors.vue";

const props = defineProps<{
  authors: string[];
}>();

const formatDate = (raw: string): string => {
  const date = new Date(raw);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const { frontmatter } = useData();
</script>

<template>
  <h3>
    {{ frontmatter.title }}
  </h3>

  <span>{{ frontmatter.description }} • {{ formatDate(frontmatter.date) }}</span>
  <Authors :authors="props.authors" />
</template>
