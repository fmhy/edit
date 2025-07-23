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

import consola from 'consola'

type Transform = {
  name: string
  find: string | RegExp
  replace: string | ((match: string) => string)
}

type TransformerFunc = (name: string, transforms: Transform[]) => Replacer

interface Replacer {
  transform: TransformerFunc
  getText(): string
}

export const transformer = (text: string) => {
  const handler: ProxyHandler<{ text: string }> = {
    get(target: { text: string }, prop: string | symbol) {
      if (prop === 'transform') {
        return (name: string, transforms: Transform[]): Replacer => {
          consola.debug(`Starting transform ${name} with ${transforms}`)

          transforms.forEach(({ name, find, replace }) => {
            consola.debug(`Transforming ${name} with ${find}`)
            target.text = target.text.replace(find, replace as any)
          })

          // @ts-expect-error - Proxy is not typed
          return proxy
        }
      }
      if (prop === 'getText') {
        return () => target.text
      }
      return Reflect.get(target, prop)
    }
  }

  const target = { text }
  const proxy = new Proxy(target, handler)
  return proxy as unknown as Replacer
}

export function replaceUnderscore(text: string): string {
  const pattern = /\/#[\w\-]+(?:_[\w]+)*/g
  const matches = text.match(pattern) || []
  let _text = text
  for (const match of matches) {
    const replacement = match.replace(/_/g, '-')
    _text = _text.replace(match, replacement)
  }
  return _text
}
