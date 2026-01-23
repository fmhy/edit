#### Pollinations Limits

For `chat.pollinations.ai` (and the underlying API), the rate limits depend on how you're using it:

**Anonymous / Free Tier (No Login)**
- **Text/Chat**: ~1 request every **3 seconds** (per IP).
- **Images**: ~1 request every **5 seconds** (per IP).

**Logged In (Pollen System)**
- Users get a **daily free Pollen allowance** based on their tier.
- **Publishable Keys (`pk_`)**: Rate limited to prevent abuse (e.g., ~1 pollen/hour per IP).
- **Secret Keys (`sk_`)**: **No rate limits** (requests run as fast as you can pay for them with Pollen).

If you're hitting limits on the chat site:
1. Slow down slightly (wait 3-5s between messages).
2. **Log in** at [enter.pollinations.ai](https://enter.pollinations.ai) to use your daily free credits.
3. If you need massive throughput, use an API key (`sk_`) with purchased credits.