---
title: Guides
---
<script setup>
import { data } from "./.vitepress/loaders/guides.data";
</script>

<template>
  <h2>Guides</h2>
  <br />
  <ul>
    <li v-for"link in data">
        <a :href="link.url">{{ link.title }}</a>
    </li>
  </ul>
</template>
