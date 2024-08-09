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
    get(target, prop) {
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
