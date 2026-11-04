import { useState, useEffect, useCallback, useRef } from "react";
import type { AppVersionInfo } from "@/types/version";

const DISMISSED_HASH_STORAGE_KEY = "lojafy_dismissed_update_hash";
const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds

// Initial build info injected by Vite define
const CURRENT_VERSION: AppVersionInfo = typeof __APP_VERSION_INFO__ !== "undefined"
  ? __APP_VERSION_INFO__
  : {
      hash: "local-dev",
      shortHash: "dev",
      message: "Ambiente local",
      author: "estevaodutra",
      timestamp: Date.now(),
    };

export function useSystemUpdate() {
  const [availableUpdate, setAvailableUpdate] = useState<AppVersionInfo | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const isCheckingRef = useRef(false);

  const checkForUpdate = useCallback(async () => {
    // Avoid concurrent overlapping requests
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      // Use cache-busting timestamp and no-cache headers to always fetch fresh version.json
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) return;

      const remoteVersion: AppVersionInfo = await response.json();

      // If remote version has a valid hash and differs from current client bundle
      if (
        remoteVersion &&
        remoteVersion.hash &&
        CURRENT_VERSION.hash &&
        remoteVersion.hash !== CURRENT_VERSION.hash
      ) {
        // Check if user already dismissed this specific hash during this session
        const dismissedHash = sessionStorage.getItem(DISMISSED_HASH_STORAGE_KEY);
        if (dismissedHash === remoteVersion.hash) {
          return;
        }

        setAvailableUpdate(remoteVersion);
      }
    } catch (err) {
      // Network/offline error - ignore silently
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    if (availableUpdate?.hash) {
      sessionStorage.setItem(DISMISSED_HASH_STORAGE_KEY, availableUpdate.hash);
    }
    setAvailableUpdate(null);
  }, [availableUpdate]);

  const applyUpdate = useCallback(async () => {
    setIsReloading(true);
    try {
      // Clear CacheStorage if present (e.g. from service workers or workbox)
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch (e) {
      console.warn("Could not clear browser caches:", e);
    }

    // Force reload bypassing browser cache
    window.location.reload();
  }, []);

  useEffect(() => {
    // Initial check after 3 seconds so we don't compete with initial page loading
    const initialTimer = setTimeout(() => {
      checkForUpdate();
    }, 3000);

    // Periodic interval
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    // Check when user focuses or tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };
    const handleFocus = () => {
      checkForUpdate();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Dev/testing helper attached to window
    (window as any).__simulateSystemUpdate = (override?: Partial<AppVersionInfo>) => {
      setAvailableUpdate({
        hash: "4fe3e46c7b9123456789abcdef",
        shortHash: "4fe3e46",
        message:
          "refactor(criafy): remove minhas demandas and planner tabs, redirecting to sprint and calendario",
        author: "estevaodutra",
        timestamp: Date.now(),
        ...override,
      });
    };

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [checkForUpdate]);

  return {
    currentVersion: CURRENT_VERSION,
    availableUpdate,
    isReloading,
    dismissUpdate,
    applyUpdate,
    checkForUpdate,
  };
}
