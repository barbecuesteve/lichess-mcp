import { describe, it, expect } from "vitest";
import { parsePgnOrJson, parseNdjsonUpTo } from "../../src/http/parse.js";

describe("parsePgnOrJson", () => {
  it("returns kind=pgn for application/x-chess-pgn content-type", async () => {
    const response = new Response("[Event ?]\n1. e4", {
      headers: { "content-type": "application/x-chess-pgn" },
    });
    const result = await parsePgnOrJson(response);
    expect(result.kind).toBe("pgn");
    expect((result as { pgn: string }).pgn).toContain("[Event ?]");
  });

  it("returns kind=json for application/json content-type", async () => {
    const response = new Response('{"id":"abc"}', {
      headers: { "content-type": "application/json" },
    });
    const result = await parsePgnOrJson(response);
    expect(result.kind).toBe("json");
    expect((result as { data: unknown }).data).toEqual({ id: "abc" });
  });

  it("uses empty string as content-type fallback when header is absent (null get)", async () => {
    const fakeResponse = {
      headers: { get: () => null },
      json: async () => ({ id: "abc" }),
    } as unknown as Response;
    const result = await parsePgnOrJson(fakeResponse);
    expect(result.kind).toBe("json");
  });
});

describe("parseNdjsonUpTo", () => {
  /** A body that emits the given chunks and stays open, like a long member list. */
  function openBody(chunks: string[]) {
    let cancelled = false;
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const c of chunks) controller.enqueue(encoder.encode(c));
      },
      cancel() {
        cancelled = true;
      },
    });
    return { response: new Response(body), cancelled: () => cancelled };
  }

  it("returns the first max objects and cancels the rest of the stream", async () => {
    const { response, cancelled } = openBody(['{"id":"a"}\n{"id":"b"}\n', '{"id":"c"}\n']);
    expect(await parseNdjsonUpTo(response, 2)).toEqual([{ id: "a" }, { id: "b" }]);
    expect(cancelled()).toBe(true);
  });

  it("joins lines split across chunks and skips blank lines", async () => {
    const { response } = openBody(['{"id":', '"a"}\n\n{"id":"b"}\n']);
    expect(await parseNdjsonUpTo(response, 2)).toEqual([{ id: "a" }, { id: "b" }]);
  });

  it("returns everything when the stream ends before max", async () => {
    expect(await parseNdjsonUpTo(new Response('{"id":"a"}\n{"id":"b"}'), 10)).toEqual([
      { id: "a" },
      { id: "b" },
    ]);
  });
});
