<script setup lang="ts">
defineProps<{
  icon: string;
}>();
</script>

<template>
  <div class="field-body">
    <div class="field-icon" :class="icon" />
    <div class="value">
      •
      <slot />
    </div>
  </div>
</template>

<style scoped>
.field-body {
  color: var(--vt-c-text-1);
  display: block;
}

.value {
  color: var(--vp-c-text-2);
}

.field-body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  gap: 12px;
}
</style>
