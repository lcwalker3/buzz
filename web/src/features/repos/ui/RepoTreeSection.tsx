import {
  CornerLeftUp,
  File,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  Folder,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { RelativeTime } from "@/shared/ui/relative-time";
import { type BrowseState, browseSearch } from "../browse-search";
import type { CommitInfo, TreeEntry } from "../git-client";

const CODE_EXT =
  /\.(tsx?|jsx?|mjs|cjs|rs|go|py|rb|java|kt|swift|dart|c|h|cpp|cs|sh|css|scss|html|sql|toml|ya?ml)$/i;

function EntryIcon({ entry }: { entry: TreeEntry }) {
  const cls = "h-4 w-4 shrink-0";
  if (entry.type === "tree") {
    return <Folder className={`${cls} fill-honey/40 text-honey-ink`} />;
  }
  const n = entry.name;
  if (/\.(md|mdx|txt|rst)$/i.test(n) || /^(readme|license)/i.test(n))
    return <FileText className={`${cls} text-ink-faint`} />;
  if (/\.json$/i.test(n))
    return <FileJson className={`${cls} text-ink-faint`} />;
  if (/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(n))
    return <FileImage className={`${cls} text-ink-faint`} />;
  if (CODE_EXT.test(n))
    return <FileCode2 className={`${cls} text-ink-faint`} />;
  return <File className={`${cls} text-ink-faint`} />;
}

const rowClass =
  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none";

function joinPath(base: string, name: string) {
  return base ? `${base}/${name}` : name;
}

function parentOf(path: string) {
  return path.split("/").slice(0, -1).join("/");
}

function TreeRow({
  entry,
  repoId,
  path,
  browse,
}: {
  entry: TreeEntry;
  repoId: string;
  path: string;
  browse: BrowseState;
}) {
  const full = joinPath(path, entry.name);
  const label = (
    <>
      <EntryIcon entry={entry} />
      <span className="truncate">{entry.name}</span>
    </>
  );
  return entry.type === "tree" ? (
    <Link
      to="/repos/$repoId/tree/$"
      params={{ repoId, _splat: full }}
      search={browseSearch(browse)}
      className={`${rowClass} font-medium text-ink`}
    >
      {label}
    </Link>
  ) : (
    <Link
      to="/repos/$repoId/blob/$"
      params={{ repoId, _splat: full }}
      search={browseSearch(browse)}
      className={`${rowClass} text-ink`}
    >
      {label}
    </Link>
  );
}

function LatestCommitBar({ commit }: { commit: CommitInfo }) {
  return (
    <div className="flex items-center gap-3 border-b border-line bg-panel-muted px-4 py-2.5 text-sm">
      <span className="shrink-0 font-medium">{commit.author.name}</span>
      <span className="min-w-0 flex-1 truncate text-ink-muted">
        {commit.message.split("\n")[0]}
      </span>
      <code className="hidden shrink-0 font-mono text-xs text-ink-faint sm:inline">
        {commit.oid.slice(0, 7)}
      </code>
      <span className="shrink-0 text-xs text-ink-faint">
        <RelativeTime unix={commit.author.timestamp} />
      </span>
    </div>
  );
}

export function RepoTreeSection({
  entries,
  isLoading,
  repoId,
  browse,
  path = "",
  latestCommit,
}: {
  entries: TreeEntry[] | undefined;
  isLoading: boolean;
  repoId: string;
  browse: BrowseState;
  path?: string;
  latestCommit?: CommitInfo;
}) {
  if (isLoading) {
    return (
      <div className="repo-card overflow-hidden">
        {["sk-1", "sk-2", "sk-3", "sk-4", "sk-5"].map((key) => (
          <div
            key={key}
            className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-b-0"
          >
            <div className="repo-skeleton h-4 w-4" />
            <div className="repo-skeleton h-4 w-40" />
          </div>
        ))}
      </div>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <div className="repo-card px-4 py-10 text-center text-sm text-ink-muted">
        {path ? "This folder is empty." : "No files on this branch yet."}
      </div>
    );
  }

  return (
    <div className="repo-card overflow-hidden">
      {latestCommit && <LatestCommitBar commit={latestCommit} />}
      <ul className="divide-y divide-line">
        {path && (
          <li>
            <Link
              to={parentOf(path) ? "/repos/$repoId/tree/$" : "/repos/$repoId"}
              params={{ repoId, _splat: parentOf(path) }}
              search={browseSearch(browse)}
              className={`${rowClass} text-ink-muted`}
              aria-label="Parent folder"
            >
              <CornerLeftUp className="h-4 w-4 shrink-0" aria-hidden />
              <span>..</span>
            </Link>
          </li>
        )}
        {entries.map((entry) => (
          <li key={entry.name}>
            <TreeRow
              entry={entry}
              repoId={repoId}
              path={path}
              browse={browse}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
