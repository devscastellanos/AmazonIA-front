import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalSeed = process.env.NEXT_PUBLIC_GAME_SEED;
const originalDifficulty = process.env.NEXT_PUBLIC_GAME_DIFFICULTY;

async function crearPartidaYLeerBody(): Promise<Record<string, unknown>> {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ id: "game_1" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  const { crearPartida } = await import("./api");
  await crearPartida("token-de-prueba");

  const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
  return JSON.parse(requestInit.body as string) as Record<string, unknown>;
}

describe("crearPartida", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    if (originalSeed === undefined) {
      delete process.env.NEXT_PUBLIC_GAME_SEED;
    } else {
      process.env.NEXT_PUBLIC_GAME_SEED = originalSeed;
    }

    if (originalDifficulty === undefined) {
      delete process.env.NEXT_PUBLIC_GAME_DIFFICULTY;
    } else {
      process.env.NEXT_PUBLIC_GAME_DIFFICULTY = originalDifficulty;
    }
  });

  it("usa la configuración por defecto cuando no hay variables de entorno", async () => {
    delete process.env.NEXT_PUBLIC_GAME_SEED;
    delete process.env.NEXT_PUBLIC_GAME_DIFFICULTY;

    await expect(crearPartidaYLeerBody()).resolves.toEqual({
      seed: 778,
      difficulty: "easy",
    });
  });

  it("envía la semilla y dificultad configuradas", async () => {
    process.env.NEXT_PUBLIC_GAME_SEED = "1234";
    process.env.NEXT_PUBLIC_GAME_DIFFICULTY = "hard";

    await expect(crearPartidaYLeerBody()).resolves.toEqual({
      seed: 1234,
      difficulty: "hard",
    });
  });

  it("descarta una semilla inválida", async () => {
    process.env.NEXT_PUBLIC_GAME_SEED = "no-es-un-numero";
    process.env.NEXT_PUBLIC_GAME_DIFFICULTY = "easy";

    await expect(crearPartidaYLeerBody()).resolves.toEqual({
      seed: 778,
      difficulty: "easy",
    });
  });
});
