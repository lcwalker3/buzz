/**
 * "Go to file": a keyboard-first path finder (press `t` anywhere in a repo).
 *
 * Matching is a case-insensitive subsequence over the full path, scored so
 * that contiguous runs, filename hits and short paths rank first. The file
 * index is built lazily from the local clone the first time the dialog opens.
 */
import { FileSearch, Loader2, Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";

import { cn } from "@/shared/lib/cn";
import { type BrowseState, browseSearch } from "../browse-search";
import { getMockFileList } from "../mock-repos";
import { useGitFileList } from "../use-git-browse";

const MAX_RESULTS = 50;

interface Match {
  path: string;
  score: number;
  /** Indexes into `path` that matched, for highlighting. */
  hits: number[];
}

/** Subsequence match; returns null when `query` isn't contained in order. */
export function scorePath(path: string, query: string): Match | null {
  if (!query) return { path, score: -path.length, hits: [] };
  const lower = path.toLowerCase();
  const q = query.toLowerCase();
  const nameStart = lower.lastIndexOf("/") + 1;
  const hits: number[] = [];
  let score = 0;
  let from = 0;
  let prev = -2;
  for (const ch of q) {
    const at = lower.indexOf(ch, from);
    if (at === -1) return null;
    hits.push(at);
    score += at === prev + 1 ? 5 : 1; // contiguous runs
    if (at >= nameStart) score += 2; // inside the filename
    if (at === nameStart || lower[at - 1] === "/" || lower[at - 1] === ".")
      score += 3; // word starts
    prev = at;
    from = at + 1;
  }
  return { path, score: score * 10 - path.length, hits };
}

function HighlightedPath({ match }: { match: Match }) {
  const hit = new Set(match.hits);
  const chars = [...match.path].map((ch, i) => ({ ch, i, on: hit.has(i) }));
  return (
    <span className="truncate font-mono text-[13px]">
      {chars.map(({ ch, i, on }) =>
        on ? (
          <mark key={i} className="bg-transparent font-semibold text-ink">
            {ch}
          </mark>
        ) : (
          <span key={i}>{ch}</span>
        ),
      )}
    </span>
  );
}

function FinderDialog({
  repoId,
  owner,
  repoName,
  gitRef,
  mock,
  browse,
  onClose,
}: {
  repoId: string;
  owner: string;
  repoName: string;
  gitRef: string;
  mock: boolean;
  browse: BrowseState;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const files = useGitFileList(owner, repoName, gitRef, !mock);
  const paths = mock ? getMockFileList() : files.data?.paths;
  const truncated = !mock && files.data?.truncated;

  const results = useMemo(() => {
    if (!paths) return [];
    const q = query.replace(/\s+/g, "");
    const scored: Match[] = [];
    for (const path of paths) {
      const m = scorePath(path, q);
      if (m) scored.push(m);
    }
    scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
    return scored.slice(0, MAX_RESULTS);
  }, [paths, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keep the highlighted option in range as results change.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(results.length - 1, 0)));
  }, [results.length]);

  useEffect(() => {
    document
      .getElementById(`${listId}-opt-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  function open(path: string) {
    onClose();
    navigate({
      to: "/repos/$repoId/blob/$",
      params: { repoId, _splat: path },
      search: browseSearch(browse),
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
      e.preventDefault();
      setActive((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[active];
      if (pick) open(pick.path);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "Tab") {
      // The search field is the dialog's only focus stop; keep focus inside.
      e.preventDefault();
    }
  }

  const loading = !mock && (files.isLoading || !files.data) && !files.error;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      {/* Backdrop: a real button so pointer dismissal has a keyboard twin
          (Esc). Kept out of the tab order; Esc is the keyboard path. */}
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close file finder"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Go to file"
        className="repo-card relative w-full max-w-xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              results.length ? `${listId}-opt-${active}` : undefined
            }
            aria-label="Search files"
            placeholder={`Go to file in ${repoName || repoId}…`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="rounded border border-line px-1.5 font-mono text-[11px] text-ink-faint">
            esc
          </kbd>
        </div>

        {loading ? (
          <p className="flex items-center justify-center gap-2 py-10 text-sm text-ink-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Indexing files…
          </p>
        ) : files.error && !mock ? (
          <p role="alert" className="px-4 py-8 text-sm text-destructive">
            Couldn't list files: {(files.error as Error).message}
          </p>
        ) : results.length === 0 ? (
          <p className="flex flex-col items-center gap-2 py-10 text-sm text-ink-muted">
            <FileSearch className="h-5 w-5 text-ink-faint" aria-hidden />
            No files match “{query}”
          </p>
        ) : (
          <div
            id={listId}
            role="listbox"
            aria-label="Matching files"
            className="max-h-[50vh] overflow-y-auto py-1.5"
          >
            {results.map((m, i) => (
              <div
                key={m.path}
                id={`${listId}-opt-${i}`}
                role="option"
                tabIndex={-1}
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  open(m.path);
                }}
                className={cn(
                  "mx-1.5 flex cursor-pointer items-center rounded-md px-3 py-1.5 text-ink-muted",
                  i === active && "bg-honey-soft text-ink",
                )}
              >
                <HighlightedPath match={m} />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-line bg-panel-muted px-4 py-2 text-xs text-ink-faint">
          <span>
            <kbd className="font-mono">↑↓</kbd> to move ·{" "}
            <kbd className="font-mono">↵</kbd> to open
          </span>
          {paths && (
            <span aria-live="polite">
              {truncated ? "First " : ""}
              {paths.length.toLocaleString()} files
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * "Go to file" button plus the global `t` shortcut. Focus returns to
 * whatever had it before the dialog opened.
 */
export function FileFinder(props: {
  repoId: string;
  owner: string;
  repoName: string;
  gitRef: string;
  mock: boolean;
  browse: BrowseState;
}) {
  const [open, setOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);

  function show() {
    returnFocus.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }

  function hide() {
    setOpen(false);
    requestAnimationFrame(() => returnFocus.current?.focus());
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "t" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      e.preventDefault();
      returnFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-keyshortcuts="t"
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-panel px-2.5 text-sm text-ink-muted shadow-xs transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Go to file</span>
        <span className="sr-only sm:hidden">Go to file</span>
        <kbd
          aria-hidden
          className="hidden rounded border border-line px-1 font-mono text-[11px] text-ink-faint sm:inline"
        >
          t
        </kbd>
      </button>
      {open && <FinderDialog {...props} onClose={hide} />}
    </>
  );
}
