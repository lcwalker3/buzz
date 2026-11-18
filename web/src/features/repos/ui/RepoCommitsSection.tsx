import { Check, Copy, GitCommitHorizontal, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { RelativeTime } from "@/shared/ui/relative-time";
import type { CommitInfo } from "../git-client";

const dayFormat = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** Group commits (already newest-first) under a calendar-day heading. */
function groupByDay(commits: CommitInfo[]) {
  const groups: { day: string; commits: CommitInfo[] }[] = [];
  for (const commit of commits) {
    const day = dayFormat.format(new Date(commit.author.timestamp * 1000));
    const last = groups[groups.length - 1];
    if (last?.day === day) last.commits.push(commit);
    else groups.push({ day, commits: [commit] });
  }
  return groups;
}

function CopySha({ oid }: { oid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(oid);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Failed to copy to clipboard");
        }
      }}
      aria-label={`Copy full commit hash ${oid.slice(0, 7)}`}
      className="flex items-center gap-1.5 rounded-md border border-line px-2 py-1 font-mono text-xs text-ink-muted transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
    >
      {oid.slice(0, 7)}
      {copied ? (
        <Check className="h-3 w-3 text-green-600" aria-hidden />
      ) : (
        <Copy className="h-3 w-3" aria-hidden />
      )}
    </button>
  );
}

function CommitRow({ commit }: { commit: CommitInfo }) {
  const [subject, ...rest] = commit.message.trim().split("\n");
  const body = rest.join("\n").trim();
  const [open, setOpen] = useState(false);

  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{subject}</p>
          {body && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label={open ? "Hide commit details" : "Show commit details"}
              className="shrink-0 rounded bg-hover px-1 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
            >
              <MoreHorizontal className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
        {open && (
          <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink-muted">
            {body}
          </pre>
        )}
        <p className="mt-1 text-xs text-ink-faint">
          <span className="font-medium text-ink-muted">
            {commit.author.name}
          </span>{" "}
          committed <RelativeTime unix={commit.author.timestamp} />
        </p>
      </div>
      <CopySha oid={commit.oid} />
    </li>
  );
}

export function RepoCommitsSection({
  commits,
  isLoading,
}: {
  commits: CommitInfo[] | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="repo-card overflow-hidden">
        {["sk-1", "sk-2", "sk-3"].map((key) => (
          <div
            key={key}
            className="space-y-2 border-b border-line px-4 py-3 last:border-b-0"
          >
            <div className="repo-skeleton h-4 w-56" />
            <div className="repo-skeleton h-3 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (!commits || commits.length === 0) {
    return (
      <div className="repo-card px-4 py-10 text-center text-sm text-ink-muted">
        No commits on this branch yet.
      </div>
    );
  }

  return (
    <ol className="relative space-y-6">
      {groupByDay(commits).map((group) => (
        <li key={group.day}>
          <h3 className="mb-2 flex items-center gap-2 text-xs font-medium text-ink-faint">
            <GitCommitHorizontal className="h-4 w-4" aria-hidden />
            Commits on {group.day}
          </h3>
          <ul className="repo-card divide-y divide-line overflow-hidden">
            {group.commits.map((commit) => (
              <CommitRow key={commit.oid} commit={commit} />
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
