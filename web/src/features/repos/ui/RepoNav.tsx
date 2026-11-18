import { BookMarked, ChevronDown, GitBranch } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";

import {
  type BrowseState,
  browseSearch,
  pathSegments,
  useBrowseState,
} from "../browse-search";
import { getMockRepo } from "../mock-repos";
import { useRepoRefs } from "../use-repo-refs";
import { useRepo } from "../use-repos";

/**
 * Everything a repo-scoped page needs: the announcement, its refs, and the
 * branch being browsed (`?ref=` or the repo's HEAD). `owner` is blank in mock
 * preview so the git queries stay disabled.
 */
export function useRepoBrowse(repoId: string) {
  const browse = useBrowseState();
  const mock = browse.preview && Boolean(getMockRepo(repoId));
  const repoQuery = useRepo(repoId, { preview: mock });
  const refsQuery = useRepoRefs(repoId, { preview: mock });
  const headRef = refsQuery.data?.head?.ref ?? "main";
  const ref = browse.ref ?? headRef;
  const repo = repoQuery.data;

  return {
    browse,
    mock,
    repo,
    repoLoading: repoQuery.isLoading,
    repoError: repoQuery.error,
    refs: refsQuery.data,
    refsLoading: refsQuery.isLoading,
    headRef,
    ref,
    owner: mock ? "" : (repo?.owner ?? ""),
    repoName: repo?.id ?? "",
  };
}

/** `repo / dir / sub / file` trail; every segment but the last is a link. */
export function RepoBreadcrumbs({
  repoId,
  path,
  browse,
}: {
  repoId: string;
  path: string;
  browse: BrowseState;
}) {
  const segments = pathSegments(path);
  const linkClass =
    "rounded-sm text-ink-muted hover:text-ink hover:underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-honey";

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1 font-mono text-sm">
        <li className="flex items-center gap-1.5">
          <BookMarked className="h-4 w-4 text-ink-faint" aria-hidden />
          {segments.length === 0 ? (
            <span className="font-semibold text-ink" aria-current="page">
              {repoId}
            </span>
          ) : (
            <Link
              to="/repos/$repoId"
              params={{ repoId }}
              search={browseSearch(browse)}
              className={`${linkClass} font-semibold`}
            >
              {repoId}
            </Link>
          )}
        </li>
        {segments.map((seg, i) => {
          const last = i === segments.length - 1;
          return (
            <li key={seg.path} className="flex items-center gap-1">
              <span aria-hidden className="text-ink-faint">
                /
              </span>
              {last ? (
                <span className="font-semibold text-ink" aria-current="page">
                  {seg.name}
                </span>
              ) : (
                <Link
                  to="/repos/$repoId/tree/$"
                  params={{ repoId, _splat: seg.path }}
                  search={browseSearch(browse)}
                  className={linkClass}
                >
                  {seg.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Branch selector. Uses a native <select> so keyboard, screen-reader and
 * touch behaviour come for free; the chrome around it matches the design.
 */
export function BranchPicker({
  branches,
  current,
  headRef,
  browse,
}: {
  branches: string[];
  current: string;
  headRef: string;
  browse: BrowseState;
}) {
  const navigate = useNavigate();
  const options = branches.includes(current)
    ? branches
    : [current, ...branches];

  return (
    <label className="relative inline-flex h-8 items-center rounded-lg border border-line bg-panel text-sm shadow-xs focus-within:border-honey focus-within:ring-3 focus-within:ring-honey-soft">
      <GitBranch
        className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-ink-faint"
        aria-hidden
      />
      <select
        aria-label="Branch"
        value={current}
        onChange={(e) => {
          const next = e.target.value;
          navigate({
            to: ".",
            search: browseSearch(browse, {
              ref: next === headRef ? null : next,
            }),
          });
        }}
        className="h-full max-w-56 appearance-none truncate bg-transparent pr-7 pl-7 font-medium text-ink outline-none"
      >
        {options.map((b) => (
          <option key={b} value={b}>
            {b}
            {b === headRef ? " (default)" : ""}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-faint"
        aria-hidden
      />
    </label>
  );
}
