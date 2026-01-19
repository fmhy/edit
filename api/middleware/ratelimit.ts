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
export default defineEventHandler(async (event) => {
  const { cloudflare, request } = event.context
  if (!cloudflare?.env?.RATE_LIMITER) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Rate limiter not available'
    })
  }

  const cf = request?.cf as { connectingIp?: string } | undefined

  const ip =
    cf?.connectingIp ??
    getHeader(event, 'CF-Connecting-IP') ??
    getHeader(event, 'X-Forwarded-For')?.split(',')[0]?.trim()

  if (!ip) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unable to determine client IP'
    })
  }

  const { success } = await cloudflare.env.RATE_LIMITER.limit({
    key: ip
  })

  if (!success) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests'
    })
  }
})
