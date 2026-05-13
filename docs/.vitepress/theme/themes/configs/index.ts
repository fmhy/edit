/**
 *  Copyright (c) 2025 taskylizard. Apache License 2.0.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import type { ThemeRegistry } from '../types'
import { bentogridTheme } from './bentogrid'
import { catppuccinTheme } from './catppuccin'
import { datadenseTheme } from './datadense'
import { infiniteCanvasTheme } from './infinite-canvas'
import { monochromeTheme } from './monochrome'
import { neumorphismTheme } from './neumorphism'
import { saasTheme } from './saas'

export const themeRegistry: ThemeRegistry = {
  catppuccin: catppuccinTheme,
  monochrome: monochromeTheme,

  bentogrid: bentogridTheme,
  datadense: datadenseTheme,
  'infinite-canvas': infiniteCanvasTheme,
  saas: saasTheme,
  neumorphism: neumorphismTheme
}

export {
  catppuccinTheme,
  monochromeTheme,
  bentogridTheme,
  datadenseTheme,
  infiniteCanvasTheme,
  saasTheme,
  neumorphismTheme
}
