import { z } from "zod";
import { AnyToolDefinition, tool, ADDITIVE, DESTRUCTIVE, READ_ONLY } from "../registry.js";
import { parseNdjson } from "../http/parse.js";

const engineIdSchema = z.object({
  id: z.string().trim().min(1).describe("The external engine ID"),
});

const engineBodySchema = {
  name: z.string().trim().min(3).max(200).describe("Display name of the engine"),
  maxThreads: z.number().int().min(1).max(65536).describe("Maximum number of available threads"),
  maxHash: z.number().int().min(1).max(1048576).describe("Maximum hash table size in MiB"),
  variants: z.array(z.string()).optional().describe("Supported chess variants"),
  providerSecret: z
    .string()
    .min(16)
    .max(1024)
    .describe("Secret token for the engine provider"),
  providerData: z.string().optional().describe("Arbitrary provider data"),
};

const listExternalEngines = tool({
  name: "list_external_engines",
  annotations: READ_ONLY,
  description: "List all external engines registered for the current user",
  schema: z.object({}),
  handler: async (_args, { client }) => client.json("/external-engine"),
});

const createExternalEngine = tool({
  name: "create_external_engine",
  annotations: ADDITIVE,
  description: "Register a new external analysis engine",
  schema: z.object(engineBodySchema),
  handler: async (body, { client }) => {
    const response = await client.postJson("/external-engine", body);
    return (await response.json()) as object;
  },
});

const getExternalEngine = tool({
  name: "get_external_engine",
  annotations: READ_ONLY,
  description: "Get a specific external engine by ID",
  schema: engineIdSchema,
  handler: async ({ id }, { client }) =>
    client.json(`/external-engine/${encodeURIComponent(id)}`),
});

const updateExternalEngine = tool({
  name: "update_external_engine",
  annotations: DESTRUCTIVE,
  description: "Update an external engine",
  schema: z.object({
    id: z.string().trim().min(1).describe("The external engine ID"),
    ...engineBodySchema,
  }),
  handler: async ({ id, ...body }, { client }) => {
    const response = await client.request(`/external-engine/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as object;
  },
});

const deleteExternalEngine = tool({
  name: "delete_external_engine",
  annotations: DESTRUCTIVE,
  description: "Delete an external engine",
  schema: engineIdSchema,
  handler: async ({ id }, { client }) => {
    await client.delete(`/external-engine/${encodeURIComponent(id)}`);
    return `External engine ${id} deleted`;
  },
});

/**
 * The analyse and work endpoints are served by engine.lichess.ovh, not
 * lichess.org, and authenticate with secrets in the body rather than OAuth.
 */
const ENGINE_BASE_URL = "https://engine.lichess.ovh/api";
const engineHost = { baseUrl: ENGINE_BASE_URL, auth: false } as const;

const analyseWithExternalEngine = tool({
  name: "analyse_with_external_engine",
  annotations: ADDITIVE,
  description:
    "Request analysis from an external engine. Returns the final evaluation once the search limit is reached.",
  schema: z.object({
    id: z.string().trim().min(1).describe("The external engine ID"),
    clientSecret: z
      .string()
      .min(1)
      .describe("The engine's clientSecret, as returned by get_external_engine"),
    work: z
      .object({
        sessionId: z.string().describe("Arbitrary string identifying the analysis session"),
        threads: z.number().int().min(1).describe("Number of threads to use"),
        hash: z.number().int().min(1).describe("Hash table size in MiB"),
        multiPv: z.number().int().min(1).max(5).default(1).describe("Number of principal variations"),
        variant: z
          .enum(["chess", "crazyhouse", "antichess", "atomic", "horde", "kingofthehill", "racingkings", "3check"])
          .default("chess"),
        initialFen: z.string().describe("Initial position FEN"),
        moves: z.array(z.string()).describe("Moves played from the initial position, in UCI"),
        movetime: z.number().int().min(1).optional().describe("Search limit: time in milliseconds"),
        depth: z.number().int().min(1).optional().describe("Search limit: target depth"),
        nodes: z.number().int().min(1).optional().describe("Search limit: number of nodes"),
      })
      .refine(
        (w) => [w.movetime, w.depth, w.nodes].filter((v) => v !== undefined).length === 1,
        { message: "Set exactly one search limit: movetime, depth or nodes" },
      ),
  }),
  handler: async ({ id, clientSecret, work }, { client }) => {
    // The response streams NDJSON until the search limit is reached; the last
    // event is the final evaluation.
    const response = await client.postJson(
      `/external-engine/${encodeURIComponent(id)}/analyse`,
      { clientSecret, work },
      engineHost,
    );
    const events = await parseNdjson<object>(response);
    return events.at(-1) ?? "The engine returned no analysis";
  },
});

const acquireExternalEngineWork = tool({
  name: "acquire_external_engine_work",
  annotations: ADDITIVE,
  description: "Long-poll for analysis work from an engine provider",
  schema: z.object({
    providerSecret: z.string().min(16).describe("The engine provider secret"),
  }),
  handler: async ({ providerSecret }, { client }) => {
    const response = await client.postJson("/external-engine/work", { providerSecret }, engineHost);
    if (response.status === 204) return "No analysis work available right now";
    return (await response.json()) as object;
  },
});

const submitExternalEngineWork = tool({
  name: "submit_external_engine_work",
  annotations: ADDITIVE,
  description: "Submit analysis results for a work request",
  schema: z.object({
    id: z.string().trim().min(1).describe("The work request ID"),
    pgn: z.string().trim().min(1).describe("Analysis results as UCI engine output"),
  }),
  handler: async ({ id, pgn }, { client }) => {
    await client.postText(
      `/external-engine/work/${encodeURIComponent(id)}`,
      pgn,
      "text/plain",
      engineHost,
    );
    return `Work ${id} submitted`;
  },
});

export const engineTools: AnyToolDefinition[] = [
  listExternalEngines,
  createExternalEngine,
  getExternalEngine,
  updateExternalEngine,
  deleteExternalEngine,
  analyseWithExternalEngine,
  acquireExternalEngineWork,
  submitExternalEngineWork,
];
