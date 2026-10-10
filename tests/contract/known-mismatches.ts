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
  ...group("Spec gap: Lichess filters by numeric status (10/20/30) exactly as by created/started/finished (verified live on /arena; /swiss assumed the same).", [
    "GET /api/team/{teamId}/arena BAD_QUERY_VALUE status=\"30\" not in [created, started, finished]",
    "GET /api/team/{teamId}/swiss BAD_QUERY_VALUE status=\"30\" not in [created, started, finished]",
  ]),
];
