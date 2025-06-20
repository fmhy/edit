import type { Preset } from 'unocss';
import { colors } from '@fmhy/colors';
import * as fs from 'fs';
import * as path from 'path';

const colorScales = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const;

function generateAllThemesCss(colorsObj: typeof colors, scales: typeof colorScales): string {
  let css = '/* FMHY_THEMES_APPLIED_STATIC_FILE_V2 */\n\n'; // New marker for this version
  const colorNames = Object.keys(colorsObj).filter(key => typeof colorsObj[key as keyof typeof colorsObj] === 'object');

  for (const colorName of colorNames) {
    const colorSet = colorsObj[colorName as keyof typeof colorsObj];
    if (!colorSet || typeof colorSet !== 'object') continue;

    const lightSelectorBase = colorName === 'swarm' ? ':root, html[data-theme="swarm"] :root' : `html[data-theme="${colorName}"] :root`;
    const darkSelectorBase = colorName === 'swarm' ? '.dark, html[data-theme="swarm"] .dark' : `html[data-theme="${colorName}"] .dark`;

    // Light theme CSS
    css += `${lightSelectorBase} {\n`;
    for (const scale of scales) {
      if (colorSet[scale]) {
        css += `  --vp-c-brand-${scale}: ${colorSet[scale]};\n`;
      }
    }
    css += `  --vp-c-brand-1: ${colorSet['500']};\n`;
    css += `  --vp-c-brand-2: ${colorSet['600']};\n`;
    css += `  --vp-c-brand-3: ${colorSet['800']};\n`;
    css += `  --vp-c-brand-soft: ${colorSet['400']};\n`;
    css += '}\n\n';

    // Dark theme CSS
    css += `${darkSelectorBase} {\n`;
    const darkColorScales = [...scales].reverse();
    for (let i = 0; i < scales.length; i++) {
      const scaleName = scales[i];
      const darkEquivalentColorValue = colorSet[darkColorScales[i]];
      if (darkEquivalentColorValue) {
        css += `  --vp-c-brand-${scaleName}: ${darkEquivalentColorValue};\n`;
      }
    }
    css += `  --vp-c-brand-1: ${colorSet['400']};\n`;
    css += `  --vp-c-brand-2: ${colorSet['500']};\n`;
    css += `  --vp-c-brand-3: ${colorSet['700']};\n`;
    css += `  --vp-c-brand-soft: ${colorSet['300']};\n`;
    css += '}\n\n';
  }
  return css;
}

export function fmhyThemePreset(): Preset {
  const cssContent = generateAllThemesCss(colors, colorScales);
  const outputPath = path.resolve(__dirname, 'generated-fmhy-themes.css');

  try {
    fs.writeFileSync(outputPath, cssContent);
    // console.log(`Successfully wrote themes to ${outputPath}`); // Keep this for build log verification
  } catch (error) {
    console.error(`Failed to write themes CSS to ${outputPath}:`, error);
  }

  return {
    name: 'unocss-fmhy-theme-static-generator',
  };
}
