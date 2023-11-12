<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import Sidebar from "./components/SidebarCard.vue";
import Announcement from "./components/Announcement.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #sidebar-nav-after>
      <Sidebar />
    </template>
    <template #home-hero-prelink>
      <Announcement />
    </template>
    <Content />
  </Layout>
</template>
