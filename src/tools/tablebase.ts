import { z } from "zod";
import { AnyToolDefinition, tool, READ_ONLY } from "../registry.js";

const TABLEBASE_BASE = "https://tablebase.lichess.org";

const fenSchema = z.object({
  fen: z.string().trim().min(1).describe("FEN of the position to look up"),
});

const lookupStandardTablebase = tool({
  name: "lookup_standard_tablebase",
  annotations: READ_ONLY,
  description: "Look up a position in the Syzygy tablebase (standard chess)",
  schema: z.object({
    fen: z.string().trim().min(1).describe("FEN of the position"),
    dtc: z
      .enum(["never", "auxiliary", "always"])
      .optional()
      .describe(
        "When to query distance to conversion (DTC). Default is auxiliary: only when the position isn't covered by the other tablebases",
      ),
  }),
  handler: async ({ fen, dtc }, { client }) => {
    const params = new URLSearchParams({ fen });
    if (dtc) params.set("dtc", dtc);
    return client.json(`/standard?${params.toString()}`, {
      baseUrl: TABLEBASE_BASE,
      auth: false,
    });
  },
});

const lookupAtomicTablebase = tool({
  name: "lookup_atomic_tablebase",
  annotations: READ_ONLY,
  description: "Look up a position in the Syzygy tablebase (atomic chess variant)",
  schema: fenSchema,
  handler: async ({ fen }, { client }) => {
    const params = new URLSearchParams({ fen });
    return client.json(`/atomic?${params.toString()}`, {
      baseUrl: TABLEBASE_BASE,
      auth: false,
    });
  },
});

const lookupAntichessTablebase = tool({
  name: "lookup_antichess_tablebase",
  annotations: READ_ONLY,
  description: "Look up a position in the Syzygy tablebase (antichess variant)",
  schema: fenSchema,
  handler: async ({ fen }, { client }) => {
    const params = new URLSearchParams({ fen });
    return client.json(`/antichess?${params.toString()}`, {
      baseUrl: TABLEBASE_BASE,
      auth: false,
    });
  },
});

export const tablebaseTools: AnyToolDefinition[] = [
  lookupStandardTablebase,
  lookupAtomicTablebase,
  lookupAntichessTablebase,
];
