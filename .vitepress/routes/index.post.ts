import { fetcher } from "itty-fetcher";
import { FeedbackSchema } from "../types/Feedback";

const feedbackOptions = [
  { label: "🐞 Bug", value: "bug" },
  {
    label: "♻️ Suggestion",
    value: "suggestion",
  },
  { label: "📂 Other", value: "other" },
  {
    label: "❤️ Appreciation",
    value: "appreciate",
  },
];

function getFeedbackOption(value: string) {
  return feedbackOptions.find((option) => option.value === value);
}

export default defineEventHandler(async (event) => {
  const { message, page, contact, type } = await readValidatedBody(event, FeedbackSchema.parse);
  const env = useRuntimeConfig(event);

  if (!["bug", "suggestion", "other", "appreciate"].includes(type!) || !message)
    throw new Error("Invalid input.");

  let description = `${message}\n\n`;
  if (contact) description += `**Contact:** ${contact}`;
  if (page) description += `**Page:** \`${page}\``;

  await fetcher()
    .post(env.WEBHOOK_URL, {
      username: "Feedback",
      avatar_url: "https://i.kym-cdn.com/entries/icons/facebook/000/043/403/cover3.jpg",
      embeds: [
        {
          color: 3447003,
          title: getFeedbackOption(type).label,
          description: description,
        },
      ],
    })
    .catch((error) => {
      throw new Error(error);
    });

  return { status: "ok" };
});
