/**
 * URL search state shared by every repo-browsing page.
 *
 * - `preview=repositories` (dev only) swaps in local mock data.
 * - `ref` pins the branch being browsed; absent means the repo's HEAD.
 *
 * Every in-repo link carries this state forward via `browseSearch()` so that
 * switching branches (or previewing) survives navigation between the
 * overview, folders, and files.
 */
import { useMemo } from "react";
import { useRouterState } from "@tanstack/react-router";

export interface BrowseState {
  preview: boolean;
  ref: string | null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function useBrowseState(): BrowseState {
  const search = useRouterState({
    select: (s) => s.location.search as Record<string, unknown>,
  });
  const preview =
    import.meta.env.DEV && readString(search.preview) === "repositories";
  const ref = readString(search.ref);
  // Stable identity so memoised consumers don't recompute every render.
  return useMemo(() => ({ preview, ref }), [preview, ref]);
}

/** Search params for an in-repo link. `undefined` keeps URLs clean. */
export function browseSearch(
  state: BrowseState,
  overrides: Partial<BrowseState> = {},
): Record<string, string> | undefined {
  const next = { ...state, ...overrides };
  const out: Record<string, string> = {};
  if (next.preview) out.preview = "repositories";
  if (next.ref) out.ref = next.ref;
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Split a repo path into cumulative breadcrumb segments. */
export function pathSegments(path: string): { name: string; path: string }[] {
  const parts = path.split("/").filter(Boolean);
  return parts.map((name, i) => ({
    name,
    path: parts.slice(0, i + 1).join("/"),
  }));
}
