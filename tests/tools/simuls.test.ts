import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  installFetchMock,
  makeContext,
  findTool,
  expectFetch,
  apiUrl,
} from "../helpers/mock.js";

beforeEach(() => {
  vi.restoreAllMocks();
});

// Only GET /api/simul is in the public spec. The API can't create, join or
// leave simuls, so there are no tools for that.

describe("get_current_simuls", () => {
  it("GETs /api/simul", async () => {
    const mock = installFetchMock();
    mock.respondJson({ ongoing: [], created: [] });

    await findTool("get_current_simuls").handler({}, makeContext());

    expectFetch(mock, { method: "GET", url: apiUrl("/simul") });
  });
});
