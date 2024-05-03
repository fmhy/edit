// This is a default export of an event handler function that returns an object with a "nitro" property set to "works".
// The function does not take any arguments and does not perform any asynchronous operations.
// It is likely used in a server-side context, such as in a Nuxt.js application, to handle a specific event and return a response.

export default eventHandler(() => {
  return { nitro: 'works' }
})

