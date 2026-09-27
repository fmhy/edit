<script setup lang="ts">
import type { ColorNames } from '../themes/configs/colors'
import { themeRegistry } from '../themes/configs'
import { normalizeColorName } from '../themes/configs/colors'
import { useTheme } from '../themes/themeHandler'
import { colors } from '../utils/colors'

withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false
})

const emit = defineEmits<{
  select: [themeName: string]
}>()

const { setTheme, mode, themeName } = useTheme()

const selectTheme = (name: string) => {
  setTheme(name)
  emit('select', name)
}

const colorOptions = Object.keys(colors).filter(
  (key) => typeof colors[key as keyof typeof colors] === 'object'
) as Array<ColorNames>

const presetThemeNames = Object.keys(themeRegistry).filter(
  (k) => !k.startsWith('color-')
)

const getThemePreviewStyle = (name: string) => {
  const theme = themeRegistry[name]
  if (!theme) return {}
  const modeKey = (mode.value ?? 'light') as keyof typeof theme.modes
  const modeColors = theme.modes[modeKey]

  if (theme.preview) {
    if (theme.preview.startsWith('http') || theme.preview.startsWith('data:')) {
      return {
        backgroundImage: `url(${theme.preview})`,
        backgroundSize: 'cover'
      }
    }
    return { background: theme.preview }
  }

  if (modeColors?.brand && modeColors.brand[1] && modeColors.brand[2]) {
    return {
      background: `linear-gradient(135deg, ${modeColors.brand[1]} 0%, ${modeColors.brand[2]} 100%)`
    }
  }

  return { background: 'var(--vp-c-brand-1)' }
}

const isColorActive = (color: string) => themeName.value === `color-${color}`

const isPresetActive = (t: string) => {
  return themeName.value === t
}
</script>

<template>
  <div class="color-picker-container">
    <div class="mb-3">
      <div
        class="text-[11px] font-semibold text-[var(--vp-c-text-3)] uppercase tracking-wider mb-2"
      >
        Color Themes
      </div>
      <div
        class="flex flex-wrap"
        :class="compact ? 'gap-1.5' : 'gap-2'"
        role="group"
        aria-label="Color Themes"
      >
        <div v-for="color in colorOptions" :key="color">
          <button
            type="button"
            :class="[
              'relative inline-flex items-center justify-center rounded-full cursor-pointer transition-all duration-200',
              compact ? 'w-5.5 h-5.5' : 'w-6 h-6',
              isColorActive(color)
                ? compact
                  ? 'ring-2 ring-[var(--vp-c-brand-1)] ring-offset-1 ring-offset-[var(--appearance-panel-surface,var(--vp-c-bg-elv))]'
                  : 'scale-110 ring-2 ring-[var(--vp-c-brand-1)] ring-offset-2 ring-offset-[var(--vp-c-bg-elv)] shadow-sm'
                : 'hover:scale-110 opacity-85 hover:opacity-100'
            ]"
            :title="normalizeColorName(color)"
            :aria-label="normalizeColorName(color)"
            :aria-pressed="isColorActive(color)"
            @click="selectTheme(`color-${color}`)"
          >
            <span
              class="relative inline-flex items-center justify-center w-full h-full rounded-full shadow-inner"
              :style="{
                backgroundColor: colors[color][500]
              }"
            >
              <span
                v-if="isColorActive(color)"
                :class="[
                  'i-ph-check text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]',
                  compact ? 'text-[10px]' : 'text-[11px]'
                ]"
              />
            </span>
          </button>
        </div>
      </div>
    </div>

    <div>
      <div
        class="text-[11px] font-semibold text-[var(--vp-c-text-3)] uppercase tracking-wider mb-2"
      >
        Theme Presets
      </div>
      <div
        class="flex flex-wrap"
        :class="compact ? 'gap-1.5' : 'gap-2'"
        role="group"
        aria-label="Theme Presets"
      >
        <div v-for="t in presetThemeNames" :key="t">
          <button
            type="button"
            :class="[
              'relative inline-flex items-center justify-center rounded-full cursor-pointer transition-all duration-200',
              compact ? 'w-5.5 h-5.5' : 'w-6 h-6',
              isPresetActive(t)
                ? compact
                  ? 'ring-2 ring-[var(--vp-c-brand-1)] ring-offset-1 ring-offset-[var(--appearance-panel-surface,var(--vp-c-bg-elv))]'
                  : 'scale-110 ring-2 ring-[var(--vp-c-brand-1)] ring-offset-2 ring-offset-[var(--vp-c-bg-elv)] shadow-sm'
                : 'hover:scale-110 opacity-85 hover:opacity-100'
            ]"
            :title="themeRegistry[t].displayName"
            :aria-label="themeRegistry[t].displayName"
            :aria-pressed="isPresetActive(t)"
            @click="selectTheme(t)"
          >
            <span
              class="relative inline-flex items-center justify-center w-full h-full rounded-full shadow-inner"
              :style="
                Object.assign(
                  {
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  },
                  getThemePreviewStyle(t)
                )
              "
            >
              <span
                v-if="isPresetActive(t)"
                :class="[
                  'i-ph-check text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]',
                  compact ? 'text-[10px]' : 'text-[11px]'
                ]"
              />
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
