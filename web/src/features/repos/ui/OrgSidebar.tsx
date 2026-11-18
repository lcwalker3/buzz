import { Users, X } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/shared/lib/cn";
import { truncatePubkey } from "@/shared/lib/pubkey";
import type { Repo } from "../use-repos";
import { ConnectButton } from "./ConnectButton";
import { PubkeyAvatar } from "./PubkeyAvatar";
import { SectionLabel } from "./RepoShell";

const MAX_PEOPLE = 12;

/** Everyone who owns or contributes to a repo, most active first. */
export function usePeople(repos: Repo[]) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const repo of repos) {
      for (const pk of new Set([repo.owner, ...repo.contributors])) {
        counts.set(pk, (counts.get(pk) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([pubkey, repoCount]) => ({ pubkey, repoCount }));
  }, [repos]);
}

export function OrgSidebar({
  repos,
  person,
  onPersonChange,
}: {
  repos: Repo[];
  person: string | null;
  onPersonChange: (pubkey: string | null) => void;
}) {
  const people = usePeople(repos);
  const shown = people.slice(0, MAX_PEOPLE);

  return (
    <div className="space-y-6">
      <div className="repo-card p-5">
        <p className="text-sm font-semibold">Work on this community</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Push branches, review patches, and talk it through with people and
          agents in the desktop app.
        </p>
        <ConnectButton className="mt-4 w-full" />
      </div>

      {people.length > 0 && (
        <div>
          <SectionLabel>
            <Users className="h-3.5 w-3.5" aria-hidden />
            People · {people.length}
            {person && (
              <button
                type="button"
                onClick={() => onPersonChange(null)}
                className="ml-auto flex items-center gap-1 rounded px-1 normal-case tracking-normal text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
              >
                <X className="h-3 w-3" aria-hidden />
                Clear
              </button>
            )}
          </SectionLabel>
          <ul className="space-y-0.5">
            {shown.map(({ pubkey, repoCount }) => {
              const active = person === pubkey;
              return (
                <li key={pubkey}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onPersonChange(active ? null : pubkey)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-honey",
                      active
                        ? "bg-honey-soft text-ink"
                        : "text-ink-muted hover:bg-hover hover:text-ink",
                    )}
                  >
                    <PubkeyAvatar pubkey={pubkey} size="sm" tooltip={false} />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {truncatePubkey(pubkey)}
                    </span>
                    <span className="text-xs tabular-nums text-ink-faint">
                      {repoCount}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {people.length > shown.length && (
            <p className="mt-2 px-2 text-xs text-ink-faint">
              +{people.length - shown.length} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}
