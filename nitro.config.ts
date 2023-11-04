//https://nitro.unjs.io/config
export default defineNitroConfig({
  runtimeConfig: {
    WEBHOOK_URL: process.env.WEBHOOK_URL,
  },
  srcDir: ".vitepress",
  routeRules: {
    "/": {
      cors: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
      },
    },
  },
});
