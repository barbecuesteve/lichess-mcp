import { z } from "zod";
import { AnyToolDefinition, tool, READ_ONLY } from "../registry.js";

const getCurrentSimuls = tool({
  name: "get_current_simuls",
  annotations: READ_ONLY,
  description: "Get current simuls",
  schema: z.object({}),
  handler: async (_args, { client }) => client.json("/simul"),
});

export const simulTools: AnyToolDefinition[] = [getCurrentSimuls];
