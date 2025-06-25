<template>
  <div class="text-6xl font-bold text-text">
    {{ timeString }}
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const time = ref<Date | null>(null)

function updateTime() {
  time.value = new Date()
}

onMounted(() => {
  updateTime()
  const interval = setInterval(updateTime, 1000)
  onUnmounted(() => clearInterval(interval))
})

const timeString = computed(() => {
  if (!time.value) return '--:--:--'
  const h = String(time.value.getHours()).padStart(2, '0')
  const m = String(time.value.getMinutes()).padStart(2, '0')
  const s = String(time.value.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
})
</script>
