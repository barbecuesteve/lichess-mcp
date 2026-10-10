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

describe("list_external_engines", () => {
  it("GETs /api/external-engine", async () => {
    const mock = installFetchMock();
    mock.respondJson([]);

    await findTool("list_external_engines").handler({}, makeContext());

    expectFetch(mock, { method: "GET", url: apiUrl("/external-engine") });
  });
});

describe("create_external_engine", () => {
  it("POSTs JSON to /api/external-engine", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "eng1", name: "Stockfish 15" });

    await findTool("create_external_engine").handler(
      {
        name: "Stockfish 15",
        maxThreads: 8,
        maxHash: 2048,
        providerSecret: "secretsecretsecretsecret",
      },
      makeContext(),
    );

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(apiUrl("/external-engine"));
    expect(init.method).toBe("POST");
    expect(init.headers.get("Content-Type")).toBe("application/json");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Stockfish 15");
    expect(body.maxThreads).toBe(8);
  });

  it("rejects name shorter than 3 chars (schema validation)", () => {
    expect(() =>
      findTool("create_external_engine").schema.parse({
        name: "SF",
        maxThreads: 4,
        maxHash: 512,
        providerSecret: "secretsecretsecretsecret",
      }),
    ).toThrow();
  });
});

describe("get_external_engine", () => {
  it("GETs /api/external-engine/{id}", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "eng1" });

    await findTool("get_external_engine").handler({ id: "eng1" }, makeContext());

    expectFetch(mock, { method: "GET", url: apiUrl("/external-engine/eng1") });
  });
});

describe("update_external_engine", () => {
  it("PUTs JSON to /api/external-engine/{id}", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "eng1" });

    await findTool("update_external_engine").handler(
      {
        id: "eng1",
        name: "Stockfish 16",
        maxThreads: 16,
        maxHash: 4096,
        providerSecret: "secretsecretsecretsecret",
      },
      makeContext(),
    );

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(apiUrl("/external-engine/eng1"));
    expect(init.method).toBe("PUT");
    const body = JSON.parse(init.body as string);
    expect(body.name).toBe("Stockfish 16");
  });
});

describe("delete_external_engine", () => {
  it("DELETEs /api/external-engine/{id}", async () => {
    const mock = installFetchMock();
    mock.respondStatus(200);

    await findTool("delete_external_engine").handler({ id: "eng1" }, makeContext());

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(apiUrl("/external-engine/eng1"));
    expect(init.method).toBe("DELETE");
  });
});

// The analyse/work endpoints are served by engine.lichess.ovh and take no
// OAuth token (security: [] in the spec); they authenticate with secrets in the body.
const ENGINE = "https://engine.lichess.ovh/api";

const sampleWork = {
  sessionId: "session1",
  threads: 4,
  hash: 256,
  initialFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  moves: ["e2e4", "e7e5"],
  movetime: 1000,
};

describe("analyse_with_external_engine", () => {
  it("POSTs { clientSecret, work } to engine.lichess.ovh without a Lichess token", async () => {
    const mock = installFetchMock();
    mock.respondNdjson([{ time: 1, depth: 10, nodes: 1, pvs: [] }]);

    const args = findTool("analyse_with_external_engine").schema.parse({
      id: "eng1",
      clientSecret: "client-secret",
      work: sampleWork,
    });
    await findTool("analyse_with_external_engine").handler(args, makeContext());

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(`${ENGINE}/external-engine/eng1/analyse`);
    expect(init.method).toBe("POST");
    expect(init.headers.get("Authorization")).toBeNull();
    expect(JSON.parse(init.body as string)).toEqual({
      clientSecret: "client-secret",
      work: { ...sampleWork, multiPv: 1, variant: "chess" },
    });
  });

  it("works without a Lichess token set", async () => {
    const mock = installFetchMock();
    mock.respondNdjson([{ depth: 1 }]);

    const args = findTool("analyse_with_external_engine").schema.parse({
      id: "eng1",
      clientSecret: "client-secret",
      work: sampleWork,
    });
    await expect(
      findTool("analyse_with_external_engine").handler(args, makeContext({ token: "" })),
    ).resolves.toBeDefined();
  });

  it("returns the final (deepest) evaluation from the NDJSON stream", async () => {
    const mock = installFetchMock();
    mock.respondNdjson([{ depth: 5 }, { depth: 12 }, { depth: 18 }]);

    const args = findTool("analyse_with_external_engine").schema.parse({
      id: "eng1",
      clientSecret: "client-secret",
      work: sampleWork,
    });
    const result = await findTool("analyse_with_external_engine").handler(args, makeContext());

    expect(result).toEqual({ depth: 18 });
  });

  it("requires exactly one search limit: movetime, depth or nodes", () => {
    const schema = findTool("analyse_with_external_engine").schema;
    const { movetime: _omit, ...noLimit } = sampleWork;
    expect(() => schema.parse({ id: "e", clientSecret: "s", work: noLimit })).toThrow();
    expect(() =>
      schema.parse({ id: "e", clientSecret: "s", work: { ...sampleWork, depth: 20 } }),
    ).toThrow();
    expect(() =>
      schema.parse({ id: "e", clientSecret: "s", work: { ...noLimit, nodes: 100000 } }),
    ).not.toThrow();
  });
});

describe("acquire_external_engine_work", () => {
  it("POSTs providerSecret to engine.lichess.ovh without a Lichess token", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "work1", work: {}, engine: {} });

    await findTool("acquire_external_engine_work").handler(
      { providerSecret: "secretsecretsecretsecret" },
      makeContext(),
    );

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(`${ENGINE}/external-engine/work`);
    expect(init.method).toBe("POST");
    expect(init.headers.get("Authorization")).toBeNull();
    expect(JSON.parse(init.body as string)).toEqual({ providerSecret: "secretsecretsecretsecret" });
  });

  it("reports no work when the long poll ends with 204", async () => {
    const mock = installFetchMock();
    mock.respondStatus(204);

    const result = await findTool("acquire_external_engine_work").handler(
      { providerSecret: "secretsecretsecretsecret" },
      makeContext(),
    );

    expect(result).toBe("No analysis work available right now");
  });
});

describe("submit_external_engine_work", () => {
  it("POSTs UCI text to engine.lichess.ovh without a Lichess token", async () => {
    const mock = installFetchMock();
    mock.respondStatus(200);

    await findTool("submit_external_engine_work").handler(
      { id: "work1", pgn: "info depth 20 score cp 30 pv e2e4" },
      makeContext(),
    );

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(`${ENGINE}/external-engine/work/work1`);
    expect(init.method).toBe("POST");
    expect(init.headers.get("Authorization")).toBeNull();
    expect(init.headers.get("Content-Type")).toBe("text/plain");
    expect(init.body).toContain("info depth 20");
  });
});
