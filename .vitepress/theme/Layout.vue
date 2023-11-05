<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import Sidebar from "./components/SidebarCard.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <Layout>
    <template #sidebar-nav-after>
      <Sidebar />
    </template>
    <template>
    <Content />

    </template>
  </Layout>
</template>
