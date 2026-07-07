/**
 *  Copyright (c) 2026 ManuJL. Apache License 2.0.
 */

import {
  FeedbackSchema,
  getFeedbackOption
} from '../../docs/.vitepress/types/Feedback'

import { readFileSync } from 'fs'

// Load blocklist at startup
let blocklist: string[] = [];

function loadBlocklist() {
  try {
    const content = readFileSync('./feedback-blocklist.txt', 'utf-8');
    blocklist = content
    .split('\n')
    .map(line => line.trim().toLowerCase())
    .filter(line => line && !line.startsWith('#'));
    console.log(`[feedback] Loaded ${blocklist.length} blocked terms`);
  } catch (err) {
    console.error('[feedback] Failed to load blocklist:', err);
    blocklist = [];
  }
}

// Load on first import
loadBlocklist();

function containsToxicContent(text: string): boolean {
  if (!text || blocklist.length === 0) return false;
  const lower = text.toLowerCase();
  return blocklist.some(word => lower.includes(word));
}

/** Escape triple backticks */
function sanitizeForDiscord(input: string): string {
  return input.replace(/```/g, "'''");
}

export default defineEventHandler(async (event) => {
  const { message, page, type, heading } = await readValidatedBody(
    event,
    FeedbackSchema.parseAsync
  );

  // Block toxic feedback silently
  if (containsToxicContent(message) || (heading && containsToxicContent(heading))) {
    const ip = getHeader(event, 'cf-connecting-ip') || 'unknown';
    console.warn(`[feedback-blocker] Toxic message blocked from ${ip}`);
    return { status: 'ok' };   // User sees success
  }

  const env = useRuntimeConfig(event);

  const pageURL = `https://fmhy.net${page}`;
  const fields = [
    { name: 'Page', value: `[${page}](${pageURL})`, inline: true },
                                  { name: 'Message', value: sanitizeForDiscord(message), inline: false }
  ];

  if (heading) {
    fields.unshift({ name: 'Section', value: sanitizeForDiscord(heading), inline: true });
  }

  // Rate limiting
  const clientIP = getHeader(event, 'cf-connecting-ip') ||
  getHeader(event, 'x-forwarded-for') ||
  event.node.req.socket.remoteAddress;

  const cf = event.context.cloudflare as any;
  if (clientIP && cf?.env?.RATE_LIMITER) {
    const { success } = await cf.env.RATE_LIMITER.limit({ key: `feedback:${clientIP}` });
    if (!success) {
      throw createError({ statusCode: 429, statusMessage: 'Too Many Requests' });
    }
  }

  // Send to Discord
  const response = await fetch(env.WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'Feedback',
      avatar_url: 'https://fmhy.net/feedback-avatar.jpg',
      embeds: [{
        color: 3447003,
        title: getFeedbackOption(type).label,
                         fields
      }]
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'Unknown error');
    console.error(`Discord webhook failed: ${response.status} - ${body}`);
    throw createError({ statusCode: 502, statusMessage: 'Failed to send feedback' });
  }

  return { status: 'ok' };
});
