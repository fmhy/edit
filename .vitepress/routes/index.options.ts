export default defineEventHandler(async (event) => {
  return sendNoContent(event, 200);
});
