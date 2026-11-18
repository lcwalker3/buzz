/**
 * React Query hooks for browsing git repos via isomorphic-git.
 *
 * All hooks depend on `useGitClone` which ensures the repo is shallow-cloned
 * into IndexedDB before any reads happen.
 */

import { useQuery } from "@tanstack/react-query";
import {
  deepenHistory,
  ensureClone,
  findReadme,
  getCommitLog,
  listAllFiles,
  readBlobView,
  readTreeEntries,
  resolveBrowseOid,
  resolveHtmlAssets,
} from "./git-client";

/**
 * Ensure the repo is cloned (or fetched) into IndexedDB.
 * Other hooks depend on this to get `fs` and `dir`.
 */
export function useGitClone(owner: string, repoName: string, ref: string) {
  return useQuery({
    queryKey: ["git-clone", owner, repoName, ref],
    queryFn: () => ensureClone(owner, repoName, ref),
    staleTime: 5 * 60_000,
    enabled: !!owner && !!repoName && !!ref,
    retry: false,
  });
}

/** Read tree entries at a path (or root). Directories first, then files, alphabetical. */
export function useGitTree(
  owner: string,
  repoName: string,
  ref: string,
  path?: string,
) {
  const cloneQuery = useGitClone(owner, repoName, ref);

  return useQuery({
    queryKey: ["git-tree", owner, repoName, ref, path ?? ""],
    queryFn: async () => {
      if (!cloneQuery.data) throw new Error("unreachable: enabled guards data");
      const { fs, dir } = cloneQuery.data;
      const oid = await resolveBrowseOid(fs, dir, ref);
      const entries = await readTreeEntries(fs, dir, oid, path || undefined);

      // Sort: directories first, then files, alphabetical within each group
      return entries.sort((a, b) => {
        if (a.type === "tree" && b.type !== "tree") return -1;
        if (a.type !== "tree" && b.type === "tree") return 1;
        return a.name.localeCompare(b.name);
      });
    },
    enabled: !!cloneQuery.data,
    staleTime: 5 * 60_000,
  });
}

/**
 * Recent commits for `ref`.
 *
 * With `history: false` (the default) this reads whatever the depth-1 clone
 * holds — enough for the "latest commit" bar. With `history: true` it first
 * deepens the clone to `HISTORY_DEPTH` commits. If deepening fails the log
 * still loads (the tip only) and `historyError` says why, with
 * `retryHistory` as the way back — a partial log is never presented as the
 * whole history.
 */
export function useGitLog(
  owner: string,
  repoName: string,
  ref: string,
  { history = false }: { history?: boolean } = {},
) {
  const cloneQuery = useGitClone(owner, repoName, ref);

  // Keyed on the clone's refresh time: a re-fetch at depth 1 re-shallows the
  // repo, so history must be deepened again after every clone refresh.
  const deepen = useQuery({
    queryKey: ["git-deepen", owner, repoName, ref, cloneQuery.dataUpdatedAt],
    queryFn: async () => {
      await deepenHistory(owner, repoName, ref);
      return true;
    },
    enabled: history && !!cloneQuery.data,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const deepenSettled = !history || deepen.isSuccess || deepen.isError;

  const logQuery = useQuery({
    queryKey: [
      "git-log",
      owner,
      repoName,
      ref,
      cloneQuery.dataUpdatedAt,
      history && deepen.isSuccess ? deepen.dataUpdatedAt : "tip",
    ],
    queryFn: async () => {
      if (!cloneQuery.data) throw new Error("unreachable: enabled guards data");
      const { fs, dir } = cloneQuery.data;
      return getCommitLog(fs, dir, ref);
    },
    enabled: !!cloneQuery.data && deepenSettled,
    staleTime: 5 * 60_000,
  });

  return {
    data: logQuery.data,
    error: logQuery.error,
    isLoading:
      logQuery.isLoading || (history && !deepenSettled && !cloneQuery.error),
    historyError: history ? deepen.error : null,
    retryHistory: deepen.refetch,
  };
}

/** Find and read the README in `path` (repo root by default). */
export function useGitReadme(
  owner: string,
  repoName: string,
  ref: string,
  path = "",
) {
  const cloneQuery = useGitClone(owner, repoName, ref);

  return useQuery({
    queryKey: ["git-readme", owner, repoName, ref, path],
    queryFn: async () => {
      if (!cloneQuery.data) throw new Error("unreachable: enabled guards data");
      const { fs, dir } = cloneQuery.data;
      return findReadme(fs, dir, ref, path);
    },
    enabled: !!cloneQuery.data,
    staleTime: 5 * 60_000,
  });
}

/** Every file path on `ref`, for the "Go to file" finder. Lazy via `enabled`. */
export function useGitFileList(
  owner: string,
  repoName: string,
  ref: string,
  enabled: boolean,
) {
  const cloneQuery = useGitClone(owner, repoName, ref);

  return useQuery({
    queryKey: ["git-file-list", owner, repoName, ref],
    queryFn: async () => {
      if (!cloneQuery.data) throw new Error("unreachable: enabled guards data");
      const { fs, dir } = cloneQuery.data;
      return listAllFiles(fs, dir, ref);
    },
    enabled: enabled && !!cloneQuery.data,
    staleTime: 5 * 60_000,
  });
}

/** Read a single file's content as a classified `BlobView`. */
export function useGitBlob(
  owner: string,
  repoName: string,
  ref: string,
  filepath: string,
) {
  const cloneQuery = useGitClone(owner, repoName, ref);

  return useQuery({
    queryKey: ["git-blob", owner, repoName, ref, filepath],
    queryFn: async () => {
      if (!cloneQuery.data) throw new Error("unreachable: enabled guards data");
      const { fs, dir } = cloneQuery.data;
      const oid = await resolveBrowseOid(fs, dir, ref);
      return readBlobView(fs, dir, oid, filepath);
    },
    enabled: !!cloneQuery.data && !!filepath,
    staleTime: 5 * 60_000,
  });
}

/**
 * Resolve an HTML file into a self-contained doc (relative assets inlined),
 * ready to drop into a sandboxed iframe. Lazy: `enabled` is caller-gated so
 * we only do the inlining work when the user clicks "Run". The decoded HTML
 * is passed in (the blob view already has it) to avoid a second read.
 */
export function useGitHtmlDoc(
  owner: string,
  repoName: string,
  ref: string,
  filepath: string,
  html: string,
  enabled: boolean,
) {
  const cloneQuery = useGitClone(owner, repoName, ref);

  return useQuery({
    queryKey: ["git-html-doc", owner, repoName, ref, filepath],
    queryFn: async () => {
      if (!cloneQuery.data) throw new Error("unreachable: enabled guards data");
      const { fs, dir } = cloneQuery.data;
      const oid = await resolveBrowseOid(fs, dir, ref);
      return resolveHtmlAssets(fs, dir, oid, filepath, html);
    },
    enabled: enabled && !!cloneQuery.data && !!filepath,
    staleTime: 5 * 60_000,
  });
}
