import { z } from "zod";
import { AnyToolDefinition, tool, ADDITIVE } from "../registry.js";
import { SITE_BASE_URL } from "../http/client.js";

const sendMessage = tool({
  name: "send_message",
  annotations: ADDITIVE,
  description: "Send a private message to a Lichess user",
  schema: z.object({
    username: z.string().trim().min(1).describe("Username of the recipient"),
    text: z.string().min(1).describe("Message text"),
  }),
  handler: async ({ username, text }, { client }) => {
    await client.postForm(`/inbox/${encodeURIComponent(username)}`, { text }, { baseUrl: SITE_BASE_URL });
    return `Message successfully sent to ${username}`;
  },
});

export const messagingTools: AnyToolDefinition[] = [sendMessage];
