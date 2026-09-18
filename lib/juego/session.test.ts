import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCESS_TOKEN_STORAGE_KEY,
  createGuestSession,
  fetchWithSession,
  refreshGuestSession,
} from "./session";

describe("session refresh", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("comparte una sola creación de sesión entre llamadas concurrentes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: "token-inicial" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const firstCreation = createGuestSession();
    const secondCreation = createGuestSession();

    expect(secondCreation).toBe(firstCreation);
    await expect(Promise.all([firstCreation, secondCreation])).resolves.toEqual([
      "token-inicial",
      "token-inicial",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("comparte una sola rotación entre renovaciones concurrentes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: "token-renovado" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const firstRefresh = refreshGuestSession("token-vencido");
    const secondRefresh = refreshGuestSession("token-vencido");

    expect(secondRefresh).toBe(firstRefresh);
    await expect(Promise.all([firstRefresh, secondRefresh])).resolves.toEqual([
      "token-renovado",
      "token-renovado",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include",
    });
    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe(
      "token-renovado",
    );
  });

  it("renueva y reintenta una petición que recibe 401", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "token-vencido");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ accessToken: "token-nuevo" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await fetchWithSession("/api/games/game_1");

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe(
      "Bearer token-vencido",
    );
    expect(fetchMock.mock.calls[1][0]).toBe("/api/sessions/refresh");
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Authorization")).toBe(
      "Bearer token-nuevo",
    );
  });

  it("prefiere el token almacenado si el argumento quedó obsoleto", async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, "token-mas-reciente");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWithSession("/api/games", {}, "token-anterior");

    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe(
      "Bearer token-mas-reciente",
    );
  });
});
