<script setup lang="ts">
withDefaults(
  defineProps<{ title?: string; icon?: string }>(),
  { icon: '/note.svg' }
)
</script>

<template>
  <VDropdown :triggers="['click', 'touch']" :auto-hide="true" :distance="15" placement="auto">
    <button
      aria-label="Tooltip"
      class="text-brand-1 inline-flex align-middle items-center justify-center leading-none p-0 select-none font-bold cursor-pointer transition-all h-[1em] w-[2em] translate-y-[0.14em]"
    >
      <div
        class="size-full bg-current transition-all"
        :style="{
           mask: `url(${icon}) no-repeat center / contain`,
           '-webkit-mask': `url(${icon}) no-repeat center / contain`,
        }"
      />
    </button>

    <template #popper>
      <div class="border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 max-w-md max-h-md border-2 border-solid p-4 transition-all">
        <h3 v-if="title" class="text-$vp-c-text-1 mb-2 text-lg font-semibold" v-text="title" />
        <div class="text-$vp-c-text-1 text-sm content">
          <slot />
        </div>
      </div>
    </template>
  </VDropdown>
</template>

<style>
.v-popper__popper { --uno: z-5000; }
.v-popper { display: inline-flex !important; }

.v-popper--theme-dropdown .v-popper__inner {
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
  padding: 0 !important;
}

.v-popper__popper .content ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}

.v-popper__popper .content ol {
  list-style: decimal;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}

.v-popper__popper .content li {
  margin: 0.25rem 0;
}

</style>
