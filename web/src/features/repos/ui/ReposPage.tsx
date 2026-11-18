import { ArrowDownUp, History, Search, SearchX, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";

import buzzAppIcon from "@/assets/app-icon@3x.png";
import { truncatePubkey } from "@/shared/lib/pubkey";
import { useDocumentTitle } from "@/shared/lib/use-document-title";
import {
  type BrowseState,
  browseSearch,
  useBrowseState,
} from "../browse-search";
import { mockRepos } from "../mock-repos";
import {
  clearRecentRepos,
  type RecentRepo,
  readRecentRepos,
} from "../recent-repos";
import type { Repo } from "../use-repos";
import { useRepos } from "../use-repos";
import { ConnectButton } from "./ConnectButton";
import { OrgSidebar, usePeople } from "./OrgSidebar";
import { RepoListItem } from "./RepoListItem";
import { RepoShell } from "./RepoShell";

type SortOrder = "newest" | "oldest" | "name";

const SORT_LABELS: Record<SortOrder, string> = {
  newest: "Recently updated",
  oldest: "Oldest first",
  name: "Name",
};

function ListItemSkeleton() {
  return (
    <div className="flex gap-4 px-5 py-4">
      <div className="repo-skeleton h-9 w-9 shrink-0 rounded-lg" />
      <div className="flex-1">
        <div className="repo-skeleton h-4 w-48" />
        <div className="repo-skeleton mt-2.5 h-3.5 w-3/4" />
        <div className="repo-skeleton mt-3 h-3 w-40" />
      </div>
    </div>
  );
}

function SearchEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-hover">
        <SearchX className="h-5 w-5 text-ink-faint" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-semibold">No matching repositories</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">
        Nothing matches those filters.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 rounded-md px-3 py-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-honey"
      >
        Clear filters
      </button>
    </div>
  );
}

/** Chips for repos this viewer opened recently (that still exist here). */
function RecentlyViewed({
  repos,
  browse,
}: {
  repos: Repo[];
  browse: BrowseState;
}) {
  const [recent, setRecent] = useState<RecentRepo[]>(readRecentRepos);
  const byId = new Map(repos.map((r) => [r.id, r]));
  const shown = recent.filter((r) => byId.has(r.id));
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="recent-title" className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-faint">
        <History className="h-3.5 w-3.5" aria-hidden />
        <h2 id="recent-title">Recently viewed</h2>
        <button
          type="button"
          onClick={() => {
            clearRecentRepos();
            setRecent([]);
          }}
          className="ml-auto rounded px-1 hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
        >
          Clear
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {shown.map((r) => (
          <li key={r.id}>
            <Link
              to="/repos/$repoId"
              params={{ repoId: r.id }}
              search={browseSearch(browse, { ref: null })}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 text-sm font-medium shadow-xs transition-colors hover:border-honey hover:bg-honey-soft focus-visible:outline-2 focus-visible:outline-honey"
            >
              {byId.get(r.id)?.name ?? r.id}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CommunityEmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center py-16 text-center">
      <div className="repo-card flex w-full max-w-xl flex-col items-center px-6 py-12 sm:px-12">
        <div
          className="h-16 w-16 overflow-hidden bg-black shadow-lg"
          style={{ borderRadius: "22.37%" }}
        >
          <img alt="Buzz" className="h-full w-full" src={buzzAppIcon} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">
          This community is empty
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          Repositories pushed to this community will show up here. Open this
          community in the Buzz desktop app to start pushing code.
        </p>
        <ConnectButton className="mt-6" />
      </div>
    </div>
  );
}

/** Focus `ref` when "/" is pressed outside a text field (GitHub-style). */
function useSlashToFocus(ref: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }
      e.preventDefault();
      ref.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [ref]);
}

export function ReposPage() {
  const browse = useBrowseState();
  const previewEmpty =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("preview") === "empty";
  const usingMock = browse.preview || previewEmpty;
  const {
    data: fetchedRepos,
    isLoading: isLoadingRepos,
    error,
  } = useRepos({ enabled: !usingMock });
  const repos = browse.preview ? mockRepos : previewEmpty ? [] : fetchedRepos;
  const isLoading = usingMock ? false : isLoadingRepos;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [person, setPerson] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useSlashToFocus(searchRef);
  useDocumentTitle("Repositories");
  const people = usePeople(repos ?? []);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load repositories", {
        description: error.message,
      });
    }
  }, [error]);

  const term = search.trim();
  const filteredRepos = useMemo(() => {
    if (!repos) return [];
    const needle = term.toLowerCase();
    const result = repos.filter(
      (r) =>
        (r.name.toLowerCase().includes(needle) ||
          r.description.toLowerCase().includes(needle)) &&
        (!person || r.owner === person || r.contributors.includes(person)),
    );
    const sorted = [...result];
    switch (sort) {
      case "newest":
        sorted.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case "oldest":
        sorted.sort((a, b) => a.createdAt - b.createdAt);
        break;
      case "name":
        sorted.sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
        break;
    }
    return sorted;
  }, [repos, term, sort, person]);

  function resetFilters() {
    setSearch("");
    setPerson(null);
    searchRef.current?.focus();
  }

  if (!isLoading && (!repos || repos.length === 0)) {
    return (
      <RepoShell browse={browse}>
        <CommunityEmptyState />
      </RepoShell>
    );
  }

  const total = repos?.length ?? 0;
  const filtered = Boolean(term) || Boolean(person);

  return (
    <RepoShell
      browse={browse}
      sidebar={
        repos && (
          <OrgSidebar
            repos={repos}
            person={person}
            onPersonChange={setPerson}
          />
        )
      }
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Repositories
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {isLoading
              ? "Loading this community's code…"
              : `${total} ${total === 1 ? "repository" : "repositories"} · ${people.length} ${people.length === 1 ? "person" : "people"}`}
          </p>
        </div>
        <ConnectButton className="lg:hidden" />
      </div>

      {repos && !isLoading && <RecentlyViewed repos={repos} browse={browse} />}

      {/* Search + sort */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Find a repository</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            placeholder="Find a repository…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && search) {
                e.preventDefault();
                setSearch("");
              }
            }}
            className="h-10 w-full rounded-lg border border-line bg-panel pr-16 pl-9 text-sm text-ink shadow-xs outline-none transition-shadow placeholder:text-ink-faint focus:border-honey focus:ring-3 focus:ring-honey-soft [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                searchRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-ink-faint hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[11px] text-ink-faint sm:block"
            >
              /
            </kbd>
          )}
        </label>
        <label className="relative">
          <span className="sr-only">Sort repositories</span>
          <ArrowDownUp
            className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            aria-hidden
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOrder)}
            aria-label="Sort repositories"
            className="h-10 w-full appearance-none rounded-lg border border-line bg-panel pr-4 pl-8 text-sm text-ink shadow-xs outline-none focus:border-honey focus:ring-3 focus:ring-honey-soft sm:w-auto"
          >
            {(Object.keys(SORT_LABELS) as SortOrder[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span aria-live="polite">
            {filteredRepos.length} of {total} shown
          </span>
          {person && (
            <button
              type="button"
              onClick={() => setPerson(null)}
              className="flex items-center gap-1 rounded-full bg-honey-soft px-2.5 py-0.5 font-mono text-xs text-ink hover:bg-honey/30 focus-visible:outline-2 focus-visible:outline-honey"
              aria-label={`Remove filter for ${truncatePubkey(person)}`}
            >
              {truncatePubkey(person)}
              <X className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
      )}

      <div className="repo-card overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-line">
            {["a", "b", "c", "d"].map((key) => (
              <ListItemSkeleton key={key} />
            ))}
          </div>
        ) : filteredRepos.length > 0 ? (
          <ul className="divide-y divide-line">
            {filteredRepos.map((repo) => (
              <RepoListItem
                key={repo.id}
                repo={repo}
                browse={browse}
                highlight={term}
              />
            ))}
          </ul>
        ) : (
          <SearchEmptyState onReset={resetFilters} />
        )}
      </div>
    </RepoShell>
  );
}
