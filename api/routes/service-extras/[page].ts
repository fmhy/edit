import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'pathe'
import { transform } from '../../../docs/.vitepress/transformer'
import { attachServiceExtras } from '../../../docs/.vitepress/utils/serviceExtras'

export default defineCachedEventHandler(
  async (event) => {
    const page = basename(getRouterParam(event, 'page') || '').replace(/\.md$/i, '')

    if (!page) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing page name'
      })
    }

    const filePath = resolve(process.cwd(), 'docs', `${page}.md`)
    if (!existsSync(filePath)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Page not found'
      })
    }

    const raw = readFileSync(filePath, 'utf-8')
    const { entries } = attachServiceExtras(transform(raw))

    appendResponseHeaders(event, {
      'cache-control': 'public, max-age=7200',
      'content-type': 'application/json;charset=utf-8'
    })

    return {
      page,
      entries
    }
  },
  {
    maxAge: 60 * 60,
    name: 'service-extras',
    getKey: (event) => `service-extras:${getRouterParam(event, 'page') || 'unknown'}`
  }
)
