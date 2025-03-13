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

import type { SatoriOptions } from 'x-satori/vue'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineSatoriConfig } from 'x-satori/vue'

const __dirname = dirname(fileURLToPath(import.meta.url))
const __fonts = resolve(__dirname, '../fonts')

const fonts: SatoriOptions['fonts'] = [
  {
    name: 'Inter',
    data: await readFile(resolve(__fonts, 'Inter-Regular.otf')),
    weight: 400,
    style: 'normal'
  },
  {
    name: 'Inter',
    data: await readFile(resolve(__fonts, 'Inter-Medium.otf')),
    weight: 500,
    style: 'normal'
  },
  {
    name: 'Inter',
    data: await readFile(resolve(__fonts, 'Inter-SemiBold.otf')),
    weight: 600,
    style: 'normal'
  },
  {
    name: 'Inter',
    data: await readFile(resolve(__fonts, 'Inter-Bold.otf')),
    weight: 700,
    style: 'normal'
  }
]

export default defineSatoriConfig({
  width: 1200,
  height: 628,
  fonts,
  props: {
    title: 'Title',
    description:
      'Lorem ipsum dolor sit amet, qui minim labore adipisicing minim sint cillum sint consectetur cupidatat.',
    dir: '/j'
  }
})
