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

describe("get_arena_tournaments", () => {
  it("GETs /api/tournament", async () => {
    const mock = installFetchMock();
    mock.respondJson({ created: [], started: [], finished: [] });

    await findTool("get_arena_tournaments").handler({}, makeContext());

    expectFetch(mock, { method: "GET", url: apiUrl("/tournament") });
  });
});

describe("create_arena", () => {
  it("POSTs JSON to /api/tournament and returns result", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "newTournament" });

    const result = await findTool("create_arena").handler(
      {
        name: "My Blitz",
        clockTime: 3,
        clockIncrement: 2,
        minutes: 45,
        waitMinutes: 5,
        variant: "standard",
        rated: true,
        berserkable: true,
        streakable: true,
        hasChat: true,
      },
      makeContext(),
    );

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(apiUrl("/tournament"));
    expect(init.method).toBe("POST");
    expect(result).toMatchObject({ id: "newTournament" });
  });
});

describe("create_arena request body", () => {
  it("sends a form, as the spec requires", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "newTournament" });

    const args = findTool("create_arena").schema.parse({ name: "My Blitz" });
    await findTool("create_arena").handler(args, makeContext());

    const [, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(init.headers.get("Content-Type")).toBe("application/x-www-form-urlencoded");
    const form = new URLSearchParams(String(init.body));
    expect(form.get("name")).toBe("My Blitz");
    expect(form.get("clockTime")).toBe("3");
    expect(form.get("rated")).toBe("true");
  });

  it("flattens conditions into the spec's dotted field names", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "newTournament" });

    const args = findTool("create_arena").schema.parse({
      name: "Restricted",
      conditions: { minRating: 1500, maxRating: 2000, nbRatedGame: 20, teamMember: "my-team" },
    });
    await findTool("create_arena").handler(args, makeContext());

    const [, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    const form = new URLSearchParams(String(init.body));
    expect(form.get("conditions.minRating.rating")).toBe("1500");
    expect(form.get("conditions.maxRating.rating")).toBe("2000");
    expect(form.get("conditions.nbRatedGame.nb")).toBe("20");
    expect(form.get("conditions.teamMember.teamId")).toBe("my-team");
    expect(form.has("conditions")).toBe(false);
  });
});

describe("get_arena_info", () => {
  it("GETs /api/tournament/{id}", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "myTournament" });

    await findTool("get_arena_info").handler({ tournamentId: "myTournament" }, makeContext());

    expectFetch(mock, { method: "GET", url: apiUrl("/tournament/myTournament") });
  });
});

describe("get_arena_games", () => {
  it("GETs /api/tournament/{id}/games", async () => {
    const mock = installFetchMock();
    mock.respondJson({ games: [] });

    await findTool("get_arena_games").handler({ tournamentId: "myTournament" }, makeContext());

    expectFetch(mock, { method: "GET", url: apiUrl("/tournament/myTournament/games") });
  });
});

describe("get_arena_results", () => {
  it("GETs /api/tournament/{id}/results", async () => {
    const mock = installFetchMock();
    mock.respondJson({ results: [] });

    await findTool("get_arena_results").handler(
      { tournamentId: "myTournament" },
      makeContext(),
    );

    const [url] = mock.mock.calls[0] as [string, unknown];
    expect(url).toBe(apiUrl("/tournament/myTournament/results"));
  });

  it("includes nb and sheet params", async () => {
    const mock = installFetchMock();
    mock.respondJson({ results: [] });

    await findTool("get_arena_results").handler(
      { tournamentId: "myTournament", nb: 50, sheet: true },
      makeContext(),
    );

    const [url] = mock.mock.calls[0] as [string, unknown];
    expect(url).toContain("nb=50");
    expect(url).toContain("sheet=true");
  });
});

describe("join_arena", () => {
  it("POSTs to /api/tournament/{id}/join", async () => {
    const mock = installFetchMock();
    mock.respondStatus(200);

    await findTool("join_arena").handler({ tournamentId: "myTournament" }, makeContext());

    expectFetch(mock, { method: "POST", url: apiUrl("/tournament/myTournament/join") });
  });
});

describe("withdraw_from_arena", () => {
  it("POSTs to /api/tournament/{id}/withdraw", async () => {
    const mock = installFetchMock();
    mock.respondStatus(200);

    await findTool("withdraw_from_arena").handler(
      { tournamentId: "myTournament" },
      makeContext(),
    );

    expectFetch(mock, { method: "POST", url: apiUrl("/tournament/myTournament/withdraw") });
  });
});

describe("get_team_battle_results", () => {
  it("GETs /api/tournament/{id}/teams", async () => {
    const mock = installFetchMock();
    mock.respondJson({ teams: [] });

    await findTool("get_team_battle_results").handler(
      { tournamentId: "myTournament" },
      makeContext(),
    );

    expectFetch(mock, { method: "GET", url: apiUrl("/tournament/myTournament/teams") });
  });
});

describe("update_arena", () => {
  it("POSTs form data to /api/tournament/{id}", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "myTournament" });

    await findTool("update_arena").handler(
      { tournamentId: "myTournament", name: "Updated Name", clockTime: 3, clockIncrement: 2, minutes: 45 },
      makeContext(),
    );

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(apiUrl("/tournament/myTournament"));
    expect(init.method).toBe("POST");
    const form = new URLSearchParams(String(init.body));
    expect(form.get("name")).toBe("Updated Name");
    expect(form.get("clockTime")).toBe("3");
    expect(form.get("clockIncrement")).toBe("2");
    expect(form.get("minutes")).toBe("45");
  });

  it("requires clockTime, clockIncrement and minutes, which the spec requires on every edit", () => {
    const schema = findTool("update_arena").schema;
    expect(() => schema.parse({ tournamentId: "t", name: "Only a name" })).toThrow();
    expect(() =>
      schema.parse({ tournamentId: "t", clockTime: 3, clockIncrement: 2, minutes: 45 }),
    ).not.toThrow();
  });
});

describe("terminate_arena", () => {
  it("POSTs to /api/tournament/{id}/terminate", async () => {
    const mock = installFetchMock();
    mock.respondStatus(200);

    await findTool("terminate_arena").handler(
      { tournamentId: "myTournament" },
      makeContext(),
    );

    expectFetch(mock, { method: "POST", url: apiUrl("/tournament/myTournament/terminate") });
  });
});

describe("update_team_battle", () => {
  it("POSTs form data to /api/tournament/team-battle/{id}", async () => {
    const mock = installFetchMock();
    mock.respondJson({ id: "myTournament" });

    await findTool("update_team_battle").handler(
      { tournamentId: "myTournament", teams: "team1,team2", nbLeaders: 2 },
      makeContext(),
    );

    const [url, init] = mock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
    expect(url).toBe(apiUrl("/tournament/team-battle/myTournament"));
    expect(init.body?.toString()).toContain("teams=team1%2Cteam2");
    expect(init.body?.toString()).toContain("nbLeaders=2");
  });
});

describe("get_user_tournaments_created", () => {
  it("GETs /api/user/{username}/tournament/created", async () => {
    const mock = installFetchMock();
    mock.respondNdjson([{ id: "t1" }]);

    await findTool("get_user_tournaments_created").handler(
      { username: "alice" },
      makeContext(),
    );

    const [url] = mock.mock.calls[0] as [string, unknown];
    expect(url).toBe(apiUrl("/user/alice/tournament/created"));
  });

  it("includes optional params", async () => {
    const mock = installFetchMock();
    mock.respondNdjson([]);

    await findTool("get_user_tournaments_created").handler(
      { username: "alice", nb: 5, status: 30 },
      makeContext(),
    );

    const [url] = mock.mock.calls[0] as [string, unknown];
    expect(url).toContain("nb=5");
    expect(url).toContain("status=30");
  });
});

describe("get_user_tournaments_played", () => {
  it("GETs /api/user/{username}/tournament/played", async () => {
    const mock = installFetchMock();
    mock.respondNdjson([{ id: "t1" }]);

    await findTool("get_user_tournaments_played").handler(
      { username: "alice" },
      makeContext(),
    );

    const [url] = mock.mock.calls[0] as [string, unknown];
    expect(url).toBe(apiUrl("/user/alice/tournament/played"));
  });

  it("includes optional params", async () => {
    const mock = installFetchMock();
    mock.respondNdjson([]);

    await findTool("get_user_tournaments_played").handler(
      { username: "alice", nb: 10, performance: true },
      makeContext(),
    );

    const [url] = mock.mock.calls[0] as [string, unknown];
    expect(url).toContain("nb=10");
    expect(url).toContain("performance=true");
  });
});
