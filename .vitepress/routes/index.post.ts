import { fetcher } from "itty-fetcher";

interface Feedback {
  message: string;
  feedbackType?: string;
  contactEmail?: string;
}

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
  if (event.headers.get("sec-fetch-mode") === "cors") return sendNoContent(event, 200);

  const { message, contactEmail, feedbackType } = await readBody<Feedback>(event);
  const env = useRuntimeConfig(event);

  if (!["bug", "suggestion", "other", "appreciate"].includes(feedbackType!) || !message) {
    throw new Error("Invalid input.");
  }

  await fetcher()
    .post(env.WEBHOOK_URL, {
      username: "Feedback",
      avatar_url: "https://i.kym-cdn.com/entries/icons/facebook/000/043/403/cover3.jpg",
      embeds: [
        {
          color: 3447003,
          title: getFeedbackOption(feedbackType).label,
          description: contactEmail ? `${message}\n\n**Contact:** ${contactEmail}` : message,
        },
      ],
    })
    .catch((error) => {
      throw new Error(error);
    });

  return "success";
});
