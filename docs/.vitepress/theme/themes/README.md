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
- `Theme`: `{ displayName, preview?, modes: { light, dark }, fonts?: { body? } }`.
- `ModeColors`:
  - `brand`: brand colors (`1`, `2`, `3`, `soft`).
  - `bg`, `bgAlt`, `bgElv`.
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
  - Theme brand colors are set as inline CSS variables.
- Text colors:
  - Applied only if defined in the theme; otherwise defaults are used.

## UI Components

- `ThemeDropdown.vue`: replaces the appearance toggle.
  - Options: Light, Dark, AMOLED (as dark variant).
  - Stores/reads mode and AMOLED-enabled state.
  - Aliased via `docs/.vitepress/config.mts` to override `VPSwitchAppearance.vue`.
- `ColorPicker.vue`:
  - Renders selectable theme swatches (generated color themes and preset themes).
  - Calls `setTheme(themeName)` on click, updating the active theme in the central registry.
- `ThemeSelector.vue`:
  - Displays the currently active theme's display name in the sidebar options card.

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
  - `displayName`, optional `preview` (image URL/data).
  - `modes.light` and `modes.dark` objects.
  - Optional `fonts.body` (e.g. for monospace themes like Monolith).
- Register it in `configs/index.ts`.
- If you omit `text` in a mode, VitePress default text colors will be used.

## CSS Variables

- Brand: `--vp-c-brand-1`, `--vp-c-brand-2`, `--vp-c-brand-3`, `--vp-c-brand-soft`.
- Background: `--vp-c-bg`, `--vp-c-bg-alt`, `--vp-c-bg-elv`.
- Text: `--vp-c-text-1`, `--vp-c-text-2`, `--vp-c-text-3`.
- Buttons: `--vp-button-brand-*`, `--vp-button-alt-*`.
- Custom blocks: `--vp-custom-block-{type}-*`.
- Selection: `--vp-c-selection-bg`.
- Home hero: `--vp-home-hero-*`.

## Migration Notes

- AMOLED is no longer a separate mode; it’s a dark enhancement (pure black backgrounds) toggled in the dropdown.
- The default `VPSwitchAppearance` toggle is replaced by `ThemeDropdown.vue` via alias in `config.mts`. The dropdown drives the radial light/dark reveal through `themes/themeTransition.ts`.

## Troubleshooting

- Theme not applying: ensure it’s added to `themeRegistry` and named correctly.
- AMOLED not pure black: confirm dark mode is active and AMOLED toggle is enabled; handler overrides backgrounds when enabled.

