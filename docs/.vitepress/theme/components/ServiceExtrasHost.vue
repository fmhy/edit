<script setup lang="ts">
import { computed } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import type { ServiceExtraEntry } from '../../utils/serviceExtras'

const props = defineProps<{ payload: string }>()

const isHoverable = useMediaQuery('(hover: hover)')
const triggers = computed(() => isHoverable.value ? ['hover'] : ['click'])

const entry = computed(() => {
  try {
    return JSON.parse(decodeURIComponent(props.payload)) as ServiceExtraEntry
  } catch {
    return null
  }
})

const totalItems = computed(() =>
  entry.value?.groups.reduce((count, group) => count + group.items.length, 0) ?? 0
)
</script>

<template>
  <VDropdown
    v-if="entry"
    :triggers="triggers"
    :popper-triggers="triggers"
    :delay="{ show: 50, hide: 50 }"
    :auto-hide="true"
    :distance="15"
    placement="auto"
  >
    <button
      type="button"
      class="service-extras-trigger"
      :aria-label="`Open extras for ${entry.serviceName}`"
    >
      <span class="service-extras-trigger__label">Extras</span>
      <span v-if="totalItems" class="service-extras-trigger__count">{{ totalItems }}</span>
    </button>

    <template #popper>
      <div class="border-$vp-c-divider bg-$vp-c-bg-alt b-rd-4 max-w-md max-h-md border-2 border-solid flex flex-col overflow-hidden">
        <div class="overflow-y-auto p-4">
          <h3 class="service-extras-popper__title">{{ entry.serviceName }} extras</h3>

          <div class="service-extras-popper__groups vp-doc">
            <section
              v-for="group in entry.groups"
              :key="group.title"
              class="service-extras-group"
            >
              <p class="service-extras-group__title">{{ group.title }}</p>
              <div class="service-extras-group__items">
                <a
                  v-for="item in group.items"
                  :key="`${group.title}-${item.label}-${item.href}`"
                  :href="item.href"
                  class="service-extras-group__item"
                >
                  {{ item.label }}
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </template>
  </VDropdown>
</template>

<style>
.service-extras-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-inline-start: 0.45rem;
  padding: 0.15rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.2;
  vertical-align: middle;
  transition:
    border-color 0.2s ease,
    color 0.2s ease,
    background-color 0.2s ease;
}

.service-extras-trigger:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-text-1);
  background: color-mix(in srgb, var(--vp-c-brand-1) 8%, transparent);
}

.service-extras-trigger__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--vp-c-brand-1) 16%, transparent);
  color: var(--vp-c-brand-1);
  font-size: 0.7rem;
  font-weight: 700;
}

.service-extras-popper__title {
  margin: 0 0 0.75rem;
  color: var(--vp-c-text-1);
  font-size: 1rem;
  font-weight: 600;
}

.service-extras-popper__groups {
  display: grid;
  gap: 0.85rem;
}

.service-extras-group__title {
  margin: 0 0 0.4rem;
  color: var(--vp-c-text-2);
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.service-extras-group__items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.service-extras-group__item {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  text-decoration: none;
}

@media (max-width: 640px) {
  .service-extras-trigger {
    margin-top: 0.3rem;
  }

  .service-extras-group__item {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
