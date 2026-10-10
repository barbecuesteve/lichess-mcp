export interface KnownMismatch {
  /** Exact string produced by checkRequest (tests/contract/spec-check.ts). */
  mismatch: string;
  reason: string;
}

const group = (reason: string, mismatches: string[]): KnownMismatch[] =>
  mismatches.map((mismatch) => ({ mismatch, reason }));

/**
 * Requests that tool tests send today which don't match the Lichess API spec.
 * Each is a bug to fix or a spec gap. Remove an entry when it's fixed; a full
 * run fails if an entry stops occurring, so this list can only shrink.
 */
export const KNOWN_MISMATCHES: KnownMismatch[] = [
  ...group("Spec gap: /api/timeline exists (live returns 401 without a token) but isn't in the spec.", [
    "GET https://lichess.org/api/timeline UNKNOWN_PATH",
  ]),
  ...group("Value outside the spec's enum. Lichess accepted it live (200), so it may be ignored rather than rejected.", [
    "GET /api/puzzle/batch/{angle} BAD_QUERY_VALUE difficulty=\"medium\" not in [easiest, easier, normal, harder, hardest]",
    "GET /api/puzzle/next BAD_QUERY_VALUE difficulty=\"hard\" not in [easiest, easier, normal, harder, hardest]",
    "GET /api/team/{teamId}/arena BAD_QUERY_VALUE status=\"30\" not in [created, started, finished]",
    "GET /api/team/{teamId}/swiss BAD_QUERY_VALUE status=\"30\" not in [created, started, finished]",
  ]),
  ...group("Query param not in the spec. Unverified whether Lichess honours it.", [
    "GET /api/broadcast/{broadcastTournamentId} UNKNOWN_QUERY clocks",
    "GET /api/broadcast/{broadcastTournamentId} UNKNOWN_QUERY comments",
    "GET /api/team/{teamId}/users UNKNOWN_QUERY max",
  ]),
];
