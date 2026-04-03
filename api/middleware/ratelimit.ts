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
  const { cloudflare } = event.context

  const ipAddress =
    getHeader(event, 'cf-connecting-ip') ||
    getHeader(event, 'x-forwarded-for') ||
    event.node.req.socket.remoteAddress

  if (ipAddress && cloudflare?.env?.RATE_LIMITER) {
    const { success } = await (
      cloudflare.env as unknown as Env
    ).RATE_LIMITER.limit({
      key: ipAddress
    })

    if (!success) {
      throw createError('Failure – rate limit exceeded')
    }
  }
})
