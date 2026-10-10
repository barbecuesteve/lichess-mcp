import { z } from "zod";
import { AnyToolDefinition, tool } from "../registry.js";

const sendMessage = tool({
  name: "send_message",
  description: "Send a private message to a Lichess user",
  schema: z.object({
    username: z.string().trim().min(1).describe("Username of the recipient"),
    text: z.string().min(1).describe("Message text"),
  }),
  handler: async ({ username, text }, { client }) => {
    await client.postForm(`/inbox/${encodeURIComponent(username)}`, { text });
    return `Message successfully sent to ${username}`;
  },
});

export const messagingTools: AnyToolDefinition[] = [sendMessage];
