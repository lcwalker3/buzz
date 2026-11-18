import {
  ArrowLeft,
  BookMarked,
  Code2,
  GitBranch,
  GitCommitHorizontal,
} from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import { toast } from "sonner";

import { cn } from "@/shared/lib/cn";
import { useDocumentTitle } from "@/shared/lib/use-document-title";
import { browseSearch } from "../browse-search";
import { getMockReadme, getMockTree, mockRepoCommits } from "../mock-repos";
import { useGitLog, useGitReadme, useGitTree } from "../use-git-browse";
import { FileFinder } from "./FileFinder";
import { RepoBranchesSection } from "./RepoBranchesSection";
import { RepoCommitsSection } from "./RepoCommitsSection";
import { BranchPicker, RepoBreadcrumbs, useRepoBrowse } from "./RepoNav";
import { RepoReadmeSection } from "./RepoReadmeSection";
import { RepoShell } from "./RepoShell";
import { RepoSidebar } from "./RepoSidebar";
import { RepoTreeSection } from "./RepoTreeSection";

type RepoBrowse = ReturnType<typeof useRepoBrowse>;

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="repo-skeleton h-8 w-64" />
      <div className="repo-skeleton h-4 w-96 max-w-full" />
      <div className="repo-skeleton mt-8 h-64 w-full rounded-xl" />
    </div>
  );
}

function RepoNotFound({ ctx }: { ctx: RepoBrowse }) {
  return (
    <RepoShell browse={ctx.browse}>
      <div className="repo-card mx-auto mt-8 max-w-lg px-6 py-12 text-center">
        <BookMarked className="mx-auto h-10 w-10 text-ink-faint" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">Repository not found</h1>
        <p className="mt-1 text-sm text-ink-muted">
          This repository may have been removed or doesn't exist on this relay.
        </p>
        <Link
          to="/"
          search={browseSearch(ctx.browse, { ref: null })}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium underline decoration-honey underline-offset-4"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to repositories
        </Link>
      </div>
    </RepoShell>
  );
}

/**
 * Shared frame for repo-scoped pages: shell, sidebar, loading/not-found,
 * error toast, and the breadcrumb + branch picker header row.
 */
export function RepoFrame({
  ctx,
  path,
  children,
  wide = false,
}: {
  ctx: RepoBrowse;
  path: string;
  children: ReactNode;
  /** Full-width content (file viewer): no sidebar. */
  wide?: boolean;
}) {
  const { repo, repoError } = ctx;
  useDocumentTitle(path || null, repo?.name);

  useEffect(() => {
    if (repoError) {
      toast.error("Failed to load repository", {
        description: repoError.message,
      });
    }
  }, [repoError]);

  if (ctx.repoLoading) {
    return (
      <RepoShell browse={ctx.browse}>
        <DetailSkeleton />
      </RepoShell>
    );
  }
  if (!repo) return <RepoNotFound ctx={ctx} />;

  return (
    <RepoShell
      browse={ctx.browse}
      sidebar={wide ? undefined : <RepoSidebar repo={repo} refs={ctx.refs} />}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {path ? (
          <RepoBreadcrumbs repoId={repo.id} path={path} browse={ctx.browse} />
        ) : (
          <h1 className="flex min-w-0 items-center gap-2.5 text-2xl font-semibold tracking-tight">
            <BookMarked
              className="h-5 w-5 shrink-0 text-ink-faint"
              aria-hidden
            />
            <span className="truncate">{repo.name}</span>
          </h1>
        )}
        <div className="flex items-center gap-2">
          <FileFinder
            repoId={repo.id}
            owner={ctx.owner}
            repoName={ctx.repoName}
            gitRef={ctx.ref}
            mock={ctx.mock}
            browse={ctx.browse}
          />
          {ctx.refs && ctx.refs.branches.length > 0 && (
            <BranchPicker
              branches={ctx.refs.branches}
              current={ctx.ref}
              headRef={ctx.headRef}
              browse={ctx.browse}
            />
          )}
        </div>
      </div>
      {children}
      {/* Sidebar content stacks below on narrow screens */}
      {!wide && (
        <div className="mt-10 lg:hidden">
          <RepoSidebar repo={repo} refs={ctx.refs} />
        </div>
      )}
    </RepoShell>
  );
}

function useBrowseError(error: unknown) {
  useEffect(() => {
    if (error) console.error("[git-browse]", error);
  }, [error]);
}

function BrowseError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      Failed to load repository contents:{" "}
      {error instanceof Error ? error.message : String(error)}
    </div>
  );
}

type Tab = "code" | "commits" | "branches";
const TABS: { id: Tab; label: string; icon: typeof Code2 }[] = [
  { id: "code", label: "Code", icon: Code2 },
  { id: "commits", label: "Commits", icon: GitCommitHorizontal },
  { id: "branches", label: "Branches", icon: GitBranch },
];

function parseTab(value: unknown): Tab {
  return value === "commits" || value === "branches" ? value : "code";
}

function RepoTabs({
  tab,
  onChange,
  commitCount,
  branchCount,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  commitCount: number | undefined;
  branchCount: number | undefined;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const jump = e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (!delta && jump < 0) return;
    e.preventDefault();
    const next = jump >= 0 ? jump : (index + delta + TABS.length) % TABS.length;
    onChange(TABS[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Repository views"
      className="mb-4 flex gap-1 border-b border-line"
    >
      {TABS.map(({ id, label, icon: Icon }, i) => {
        const selected = tab === id;
        return (
          <button
            key={id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`repo-tab-${id}`}
            aria-selected={selected}
            aria-controls={`repo-panel-${id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:rounded-t-md focus-visible:outline-2 focus-visible:outline-honey",
              selected
                ? "border-honey text-ink"
                : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
            {(id === "commits"
              ? commitCount
              : id === "branches"
                ? branchCount
                : undefined) !== undefined && (
              <span className="rounded-full bg-hover px-1.5 text-xs tabular-nums text-ink-muted">
                {id === "commits" ? commitCount : branchCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function RepoDetailPage() {
  const { repoId } = useParams({ from: "/repos/$repoId" });
  const ctx = useRepoBrowse(repoId);
  const navigate = useNavigate();
  const tab = useRouterState({
    select: (s): Tab =>
      parseTab((s.location.search as Record<string, unknown>).tab),
  });

  const tree = useGitTree(ctx.owner, ctx.repoName, ctx.ref);
  const log = useGitLog(ctx.owner, ctx.repoName, ctx.ref);
  const readme = useGitReadme(ctx.owner, ctx.repoName, ctx.ref);
  const treeEntries = ctx.mock ? getMockTree("") : tree.data;
  const commits = ctx.mock ? mockRepoCommits : log.data;
  const readmeData = ctx.mock ? getMockReadme("") : readme.data;
  const browseError = ctx.mock ? null : tree.error || log.error;
  useBrowseError(browseError);

  return (
    <RepoFrame ctx={ctx} path="">
      {ctx.repo?.description && (
        <p className="-mt-2 mb-6 max-w-2xl text-sm leading-relaxed text-ink-muted">
          {ctx.repo.description}
        </p>
      )}
      <BrowseError error={browseError} />
      <RepoTabs
        tab={tab}
        commitCount={commits?.length}
        branchCount={ctx.refs?.branches.length}
        onChange={(next) =>
          navigate({
            to: ".",
            search: {
              ...browseSearch(ctx.browse),
              ...(next === "code" ? {} : { tab: next }),
            },
            replace: true,
          })
        }
      />
      <div
        role="tabpanel"
        id={`repo-panel-${tab}`}
        aria-labelledby={`repo-tab-${tab}`}
      >
        {tab === "code" ? (
          <>
            <RepoTreeSection
              entries={treeEntries}
              isLoading={!ctx.mock && tree.isLoading}
              repoId={repoId}
              browse={ctx.browse}
              latestCommit={commits?.[0]}
            />
            <RepoReadmeSection
              readme={readmeData}
              isLoading={!ctx.mock && readme.isLoading}
              repoId={repoId}
              browse={ctx.browse}
            />
          </>
        ) : tab === "commits" ? (
          <RepoCommitsSection
            commits={commits}
            isLoading={!ctx.mock && log.isLoading}
          />
        ) : (
          <RepoBranchesSection
            repoId={repoId}
            refs={ctx.refs}
            current={ctx.ref}
            headRef={ctx.headRef}
            browse={ctx.browse}
          />
        )}
      </div>
    </RepoFrame>
  );
}

/** A sub-folder listing: `/repos/:repoId/tree/some/dir`. */
export function RepoTreePage() {
  const { repoId, _splat } = useParams({ from: "/repos/$repoId/tree/$" });
  const path = (_splat ?? "").replace(/^\/+|\/+$/g, "");
  const ctx = useRepoBrowse(repoId);
  const tree = useGitTree(ctx.owner, ctx.repoName, ctx.ref, path);
  const readme = useGitReadme(ctx.owner, ctx.repoName, ctx.ref, path);
  const entries = ctx.mock ? getMockTree(path) : tree.data;
  const readmeData = ctx.mock ? getMockReadme(path) : readme.data;
  const error = ctx.mock ? null : tree.error;
  useBrowseError(error);

  return (
    <RepoFrame ctx={ctx} path={path}>
      <BrowseError error={error} />
      <RepoTreeSection
        entries={entries}
        isLoading={!ctx.mock && tree.isLoading}
        repoId={repoId}
        browse={ctx.browse}
        path={path}
      />
      <RepoReadmeSection
        readme={readmeData}
        isLoading={!ctx.mock && readme.isLoading}
        repoId={repoId}
        path={path}
        browse={ctx.browse}
      />
    </RepoFrame>
  );
}
