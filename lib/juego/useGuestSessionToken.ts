"use client";

import { useEffect } from "react";

import {
  createGuestSession,
  getCurrentSessionInfo,
  getStoredAccessToken,
  isTokenExpiredError,
  parseSessionExpiresAt,
  refreshGuestSession,
} from "./session";

const REFRESH_MARGIN_MS = 60_000;

export function useGuestSessionToken(enabled = true): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;

    const clearScheduledRefresh = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const scheduleNextRefresh = (expiresAt: string | null, token: string) => {
      clearScheduledRefresh();

      const expiresAtDate = parseSessionExpiresAt(expiresAt);
      if (!expiresAtDate || cancelled) {
        return;
      }

      const remainingMs = expiresAtDate.getTime() - Date.now();
      if (remainingMs <= 0) {
        void refreshAndReschedule(token).catch((error) => {
          console.error("No se pudo renovar la sesión de la partida:", error);
        });
        return;
      }

      // Para TTL cortos usamos el 10 % del tiempo restante para no entrar en
      // un ciclo inmediato de renovaciones.
      const marginMs = Math.min(REFRESH_MARGIN_MS, remainingMs / 10);
      const delay = remainingMs - marginMs;
      timeoutId = window.setTimeout(() => {
        void refreshAndReschedule(getStoredAccessToken() ?? token).catch((error) => {
          console.error("No se pudo renovar la sesión de la partida:", error);
        });
      }, delay);
    };

    const loadCurrentSession = async (token: string) => {
      const currentInfo = await getCurrentSessionInfo(token);
      if (cancelled) {
        return;
      }

      scheduleNextRefresh(currentInfo.expiresAt, token);
    };

    const refreshAndReschedule = async (token: string) => {
      const refreshedToken = await refreshGuestSession(token);
      if (cancelled) {
        return;
      }

      await loadCurrentSession(refreshedToken);
    };

    void (async () => {
      const storedToken = getStoredAccessToken();

      if (!storedToken) {
        const token = await createGuestSession();
        if (!cancelled) {
          await loadCurrentSession(token);
        }
        return;
      }

      try {
        await loadCurrentSession(storedToken);
      } catch (error) {
        if (isTokenExpiredError(error)) {
          await refreshAndReschedule(storedToken);
          return;
        }

        throw error;
      }
    })().catch((error) => {
      console.error("No se pudo generar la sesión de invitado:", error);
    });

    return () => {
      cancelled = true;
      clearScheduledRefresh();
    };
  }, [enabled]);
}
