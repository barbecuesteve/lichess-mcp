export async function parseJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function parseNdjson<T>(response: Response): Promise<T[]> {
  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
}

export async function parsePgnOrJson(
  response: Response,
): Promise<{ kind: "pgn"; pgn: string } | { kind: "json"; data: unknown }> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-chess-pgn") || contentType.includes("text/")) {
    return { kind: "pgn", pgn: await response.text() };
  }
  return { kind: "json", data: await response.json() };
}

/**
 * Reads up to `max` objects from an NDJSON response, then cancels the body.
 * For endpoints that stream an unbounded list with no server-side limit.
 */
export async function parseNdjsonUpTo<T>(response: Response, max: number): Promise<T[]> {
  if (!response.body) return [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const items: T[] = [];
  let buffer = "";
  const take = (line: string) => {
    if (line.trim()) items.push(JSON.parse(line) as T);
  };
  try {
    while (items.length < max) {
      const { done, value } = await reader.read();
      if (done) {
        take(buffer + decoder.decode());
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while (items.length < max && (newline = buffer.indexOf("\n")) !== -1) {
        take(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    }
    return items.slice(0, max);
  } finally {
    await reader.cancel().catch(() => {});
  }
}
