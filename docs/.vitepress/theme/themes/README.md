# Theme System

This document explains the updated theme architecture, display modes, and integration components in the site.

## Architecture

- Display modes: `light` and `dark`.
- AMOLED: an enhancement of `dark` mode (pure black backgrounds) toggled on top of dark — not a separate mode.
- Themes: color schemes and optional design tokens that apply across modes.
- Modes are independent from themes; themes define colors and tokens for light/dark.

## File Structure

```
docs/.vitepress/theme/themes/
├── types.ts             // Type definitions
├── themeHandler.ts      // Theme handler logic & DOM/CSS application
├── index.ts             // Exports
└── configs/
    ├── index.ts         // Theme registry (default + named themes)
    └── catppuccin.ts    // Example theme (default)
```

## Core Types

- `DisplayMode`: `'light' | 'dark'`.
- `Theme`: `{ name, displayName, preview?, logo?, modes: { light, dark }, ... }`.
- `ModeColors`:
  - `brand?`: optional brand colors (`1`, `2`, `3`, `soft`). If omitted, the ColorPicker controls brand.
  - `bg`, `bgAlt`, `bgElv`, `bgMark?`.
  - `text?`: optional (`1`, `2`, `3`). If omitted, VitePress defaults are used.
  - `button`: `brand` and `alt` sub-objects with `bg`, `border`, `text`, `hover*`, `active*`.
  - `customBlock`: `info`, `tip`, `warning`, `danger` with `bg`, `border`, `text`, `textDeep`.
  - `selection`: `{ bg }`.
  - `home?`: optional hero styles.

## Handler Behavior (`themeHandler.ts`)

- Persists `theme` (`vitepress-theme-name`) and `mode` (`vitepress-display-mode`).
- Applies HTML classes: always the current mode; adds `dark` for compatibility; adds `amoled` when dark + AMOLED enabled.
- AMOLED handling: overrides dark backgrounds to pure black while retaining other dark tokens.
- Brand colors:
  - If theme provides brand colors, inline CSS variables are set.
  - If theme omits brand colors, inline brand variables are removed so the ColorPicker stylesheet takes effect.
- Text colors:
  - Applied only if defined in the theme; otherwise defaults are used.
- Custom logo:
  - If theme provides `logo`, sets `--vp-theme-logo: url(...)` for downstream usage.

## UI Components

- `ThemeDropdown.vue`: replaces the appearance toggle.
  - Options: Light, Dark, AMOLED (as dark variant).
  - Stores/reads mode and AMOLED-enabled state.
  - Aliased via `docs/.vitepress/config.mts` to override `VPSwitchAppearance.vue`.
- `ColorPicker.vue`:
  - Controls brand color CSS variables via a stylesheet tag (`#brand-color`).
  - Reapplies colors on a custom event `theme-changed-apply-colors` when switching to themes without brand.
- `ThemeSelector.vue`:
  - Shows circular previews per theme (image via `preview` or gradient fallback).
  - Calls `setTheme(name)`; independent from ColorPicker.

## Theme Registry (`configs/index.ts`)

- Example:
```ts
import { catppuccinTheme } from './catppuccin'

export const themeRegistry = {
  default: catppuccinTheme,
  catppuccin: catppuccinTheme
}
```

## Creating a Theme (`configs/<name>.ts`)

- Export a `Theme` object with:
  - `name`, `displayName`, optional `preview` (image URL/data) and `logo`.
  - `modes.light` and `modes.dark` objects.
  - Optional `fonts`, `spacing`, `borderRadius`, `customProperties`.
- Register it in `configs/index.ts`.
- If you omit `brand` in a mode, the ColorPicker-selected brand colors will be used.
- If you omit `text` in a mode, VitePress default text colors will be used.

## CSS Variables

- Brand: `--vp-c-brand-1`, `--vp-c-brand-2`, `--vp-c-brand-3`, `--vp-c-brand-soft`.
- Background: `--vp-c-bg`, `--vp-c-bg-alt`, `--vp-c-bg-elv`, `--vp-c-bg-mark`.
- Text: `--vp-c-text-1`, `--vp-c-text-2`, `--vp-c-text-3`.
- Buttons: `--vp-button-brand-*`, `--vp-button-alt-*`.
- Custom blocks: `--vp-custom-block-{type}-*`.
- Selection: `--vp-c-selection-bg`.
- Home hero: `--vp-home-hero-*`.
- Custom props: all keys in `customProperties`.
- Optional: `--vp-theme-logo` (when theme defines `logo`).

## Migration Notes

- AMOLED is no longer a separate mode; it’s a dark enhancement (pure black backgrounds) toggled in the dropdown.
- The legacy `Appearance.vue` toggle is replaced by `ThemeDropdown.vue` via alias in `config.mts`.
- Themes can rely on the ColorPicker for brand colors by omitting `brand`.

## Troubleshooting

- Theme not applying: ensure it’s added to `themeRegistry` and named correctly.
- Brand not changing: if a theme sets inline brand variables, ColorPicker won’t override; remove `brand` from the theme to defer to ColorPicker.
- Colors not updating after theme switch: ColorPicker listens for `theme-changed-apply-colors`; make sure that event dispatch remains in `setTheme()`.
- AMOLED not pure black: confirm dark mode is active and AMOLED toggle is enabled; handler overrides backgrounds when enabled.

