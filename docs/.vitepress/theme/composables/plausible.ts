import {
  createPlausibleTracker,
  type Plausible,
  type PlausibleOptions
} from '@barbapapazes/plausible-tracker'
import {
  useAutoPageviews,
  useAutoOutboundTracking
} from '@barbapapazes/plausible-tracker/extensions'

import type { App } from 'vue'
import { inject } from 'vue'

interface ScriptLoaderOption extends Partial<HTMLScriptElement> {
  'data-domain': string
}

function loadScript(
  source: string,
  options: ScriptLoaderOption = {} as ScriptLoaderOption
) {
  return new Promise((resolve, reject) => {
    const head = document.head || document.getElementsByTagName('head')[0]
    const script = document.createElement('script')
    const {
      src,
      type = 'text/javascript',
      defer = false,
      async = false,
      ...restAttrs
    } = options
    script.type = type
    script.defer = defer
    script.async = async
    script.src = src || source
    script.setAttribute('data-domain', options['data-domain'])

    Object.keys(restAttrs).forEach((attr) => {
      ; (script as any)[attr] = (restAttrs as any)[attr]
    })

    head.appendChild(script)
    script.onload = resolve
    script.onerror = reject
  })
}
export function createPlausible(
  options: Partial<PlausibleOptions> & { domain: string; apiHost: string }
): {
  install(app: App): void
} {
  const plausible = {
    install(app: App): void {
      if (
        // only in production
        process.env.NODE_ENV === 'production' &&
        // and we are ready
        typeof window !== 'undefined'
      ) {
        const $plausible = createPlausibleTracker(options)

        const { install: _useAutoPageviews } =
          // biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
          useAutoPageviews($plausible)
        const { install: _useAutoOutboundTracking } =
          // biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
          useAutoOutboundTracking($plausible)

        _useAutoPageviews()
        _useAutoOutboundTracking()

        app.config.globalProperties.$plausible = $plausible
        app.provide('$plausible', $plausible)
      }
    }
  }
  return plausible
}

export function usePlausible() {
  const plausible = inject('$plausible') as Plausible

  return {
    ...plausible
  }
}

declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $plausible: Plausible
  }
}
