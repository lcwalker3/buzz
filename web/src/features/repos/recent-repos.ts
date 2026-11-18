/**
 * "Recently viewed" repositories — a per-viewer convenience kept in this
 * browser's localStorage. Scoped per relay so communities never mix, capped,
 * and tolerant of storage being unavailable (private mode, blocked site data):
 * every access is wrapped and failure just means an empty list.
 */
import { relayWsUrl } from "@/shared/lib/relay-url";

const MAX_RECENT = 5;

function storageKey(): string {
  return `buzz-web-recent-repos:${relayWsUrl()}`;
}

export interface RecentRepo {
  id: string;
  viewedAt: number;
}

export function readRecentRepos(): RecentRepo[] {
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (r): r is RecentRepo =>
          typeof r?.id === "string" && typeof r?.viewedAt === "number",
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function recordRecentRepo(id: string): void {
  try {
    const next = [
      { id, viewedAt: Date.now() },
      ...readRecentRepos().filter((r) => r.id !== id),
    ].slice(0, MAX_RECENT);
    window.localStorage.setItem(storageKey(), JSON.stringify(next));
  } catch {
    // Storage unavailable: nothing to remember this visit.
  }
}

export function clearRecentRepos(): void {
  try {
    window.localStorage.removeItem(storageKey());
  } catch {
    // Storage unavailable: nothing stored to clear.
  }
}
