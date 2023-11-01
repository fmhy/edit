<script setup lang="ts">
defineProps<{
  icon: string;
}>();
</script>

<template>
  <div class="field-body">
    <div class="text-xl" :class="icon" />
    <!-- <p class="m-[10px 10px]">•</p> -->
    <div class="text-[var(--vp-c-text-2)]">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.field-body {
  color: var(--vt-c-text-1);
  display: block;
}

.field-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}
</style>
