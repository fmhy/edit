<script setup lang="ts">
import type { ColorNames } from '../themes/configs/colors'
import { themeRegistry } from '../themes/configs'
import { normalizeColorName } from '../themes/configs/colors'
import { useTheme } from '../themes/themeHandler'
import { colors } from '../utils/colors'

const { setTheme, mode, themeName } = useTheme()

const colorOptions = Object.keys(colors).filter(
  (key) => typeof colors[key as keyof typeof colors] === 'object'
) as Array<ColorNames>

const presetThemeNames = Object.keys(themeRegistry).filter(
  (k) => !k.startsWith('color-')
)

const getThemePreviewStyle = (name: string) => {
  const theme = themeRegistry[name]
  if (!theme) return {}
  const modeKey =
    mode && (mode as any).value
      ? ((mode as any).value as keyof typeof theme.modes)
      : 'light'
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
  <div>
    <div class="flex flex-wrap gap-2">
      <!-- Color picker generated themes (render first) -->
      <div v-for="color in colorOptions" :key="color">
        <button
          type="button"
          :class="[
            'relative inline-flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-all duration-200',
            isColorActive(color)
              ? 'scale-110 ring-2 ring-[var(--vp-c-text-1)] ring-offset-2 ring-offset-[var(--vp-c-bg-soft)] shadow-md'
              : 'hover:scale-105 opacity-80 hover:opacity-100'
          ]"
          :title="normalizeColorName(color)"
          :aria-label="normalizeColorName(color)"
          :aria-pressed="isColorActive(color)"
          @click="setTheme(`color-${color}`)"
        >
          <span
            class="relative inline-flex items-center justify-center w-full h-full rounded-full"
            :style="{
              backgroundColor: colors[color][500],
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }"
          >
            <span
              v-if="isColorActive(color)"
              class="i-ph-check text-[11px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            />
          </span>
        </button>
      </div>

      <!-- Preset themes (render at the end) -->
      <div v-for="t in presetThemeNames" :key="t">
        <button
          type="button"
          :class="[
            'relative inline-flex items-center justify-center w-6 h-6 rounded-full cursor-pointer transition-all duration-200',
            isPresetActive(t)
              ? 'scale-110 ring-2 ring-[var(--vp-c-text-1)] ring-offset-2 ring-offset-[var(--vp-c-bg-soft)] shadow-md'
              : 'hover:scale-105 opacity-80 hover:opacity-100'
          ]"
          :title="themeRegistry[t].displayName"
          :aria-label="themeRegistry[t].displayName"
          :aria-pressed="isPresetActive(t)"
          @click="setTheme(t)"
        >
          <span
            class="relative inline-flex items-center justify-center w-full h-full rounded-full"
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
              class="i-ph-check text-[11px] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
            />
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
