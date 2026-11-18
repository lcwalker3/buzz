import { Check, GitBranch, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { type BrowseState, browseSearch } from "../browse-search";
import type { RepoRefs } from "../use-repo-refs";

/** Branch and tag lists. Picking a branch opens its code view. */
export function RepoBranchesSection({
  repoId,
  refs,
  current,
  headRef,
  browse,
}: {
  repoId: string;
  refs: RepoRefs | undefined;
  current: string;
  headRef: string;
  browse: BrowseState;
}) {
  const branches = [...(refs?.branches ?? [])].sort((a, b) =>
    a === headRef ? -1 : b === headRef ? 1 : a.localeCompare(b),
  );
  const tags = [...(refs?.tags ?? [])].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-medium text-ink-faint">
          Branches · {branches.length}
        </h2>
        {branches.length === 0 ? (
          <p className="repo-card px-4 py-8 text-center text-sm text-ink-muted">
            No branches have been pushed yet.
          </p>
        ) : (
          <ul className="repo-card divide-y divide-line overflow-hidden">
            {branches.map((b) => (
              <li key={b}>
                <Link
                  to="/repos/$repoId"
                  params={{ repoId }}
                  search={browseSearch(browse, {
                    ref: b === headRef ? null : b,
                  })}
                  aria-current={b === current ? "true" : undefined}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-hover focus-visible:bg-hover focus-visible:outline-none"
                >
                  <GitBranch
                    className="h-4 w-4 shrink-0 text-ink-faint"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px]">
                    {b}
                  </span>
                  {b === headRef && (
                    <span className="rounded-full bg-honey-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-honey-ink">
                      Default
                    </span>
                  )}
                  {b === current && (
                    <Check
                      className="h-4 w-4 text-ink-muted"
                      aria-label="Currently viewing"
                    />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xs font-medium text-ink-faint">
          Tags · {tags.length}
        </h2>
        {tags.length === 0 ? (
          <p className="repo-card px-4 py-8 text-center text-sm text-ink-muted">
            No tags yet.
          </p>
        ) : (
          <ul className="repo-card flex flex-wrap gap-2 p-4">
            {tags.map((t) => (
              <li
                key={t}
                className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-xs text-ink-muted"
              >
                <Tag className="h-3 w-3" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
