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
// `node:net` isn't available in the Workers runtime, so validate with a regex.
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/
const IPV6 = /^[0-9a-fA-F:]+$/
function isValidIP(ip: string): boolean {
  return IPV4.test(ip) || (ip.includes(':') && IPV6.test(ip))
}

export default defineEventHandler(async (event) => {
  const { cloudflare } = event.context

  // Prefer `cf-connecting-ip` (Cloudflare-set, not client-spoofable); fall back
  // to the last hop of `x-forwarded-for`, then the socket address.
  const cf = getHeader(event, 'cf-connecting-ip')
  const xff = getHeader(event, 'x-forwarded-for')
  const lastHop = xff
    ?.split(',')
    .map((p) => p.trim())
    .at(-1)
  const candidate = cf || lastHop || event.node.req.socket.remoteAddress
  const ipAddress = candidate && isValidIP(candidate) ? candidate : undefined

  const limiter = cloudflare?.env?.RATE_LIMITER
  if (ipAddress && limiter) {
    const { success } = await limiter.limit({ key: ipAddress })

    if (!success) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Rate limit exceeded'
      })
    }
  }
})
