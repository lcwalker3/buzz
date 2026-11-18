import { BookMarked, ChevronRight, Clock, MessageSquare } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { RelativeTime } from "@/shared/ui/relative-time";
import { truncatePubkey } from "@/shared/lib/pubkey";
import { type BrowseState, browseSearch } from "../browse-search";
import type { Repo } from "../use-repos";
import { AvatarStack } from "./PubkeyAvatar";

/** Wrap each case-insensitive match of `term` in a <mark>. */
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const lower = text.toLowerCase();
  const needle = term.toLowerCase();
  const parts: { text: string; match: boolean; at: number }[] = [];
  let at = 0;
  while (at < text.length) {
    const hit = lower.indexOf(needle, at);
    if (hit === -1) {
      parts.push({ text: text.slice(at), match: false, at });
      break;
    }
    if (hit > at) parts.push({ text: text.slice(at, hit), match: false, at });
    parts.push({
      text: text.slice(hit, hit + needle.length),
      match: true,
      at: hit,
    });
    at = hit + needle.length;
  }
  return (
    <>
      {parts.map((p) =>
        p.match ? (
          <mark key={p.at} className="rounded-sm bg-honey-soft px-0.5">
            {p.text}
          </mark>
        ) : (
          <span key={p.at}>{p.text}</span>
        ),
      )}
    </>
  );
}

export function RepoListItem({
  repo,
  browse,
  highlight = "",
}: {
  repo: Repo;
  browse: BrowseState;
  highlight?: string;
}) {
  const people = [
    repo.owner,
    ...repo.contributors.filter((c) => c !== repo.owner),
  ];

  return (
    <li className="group relative">
      <div className="flex items-start gap-4 px-5 py-4 transition-colors group-hover:bg-hover">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-honey-soft text-honey-ink">
          <BookMarked className="h-4 w-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to="/repos/$repoId"
              params={{ repoId: repo.id }}
              search={browseSearch(browse, { ref: null })}
              className="truncate text-[15px] font-semibold text-ink outline-none after:absolute after:inset-0 after:rounded-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-honey"
            >
              <Highlight text={repo.name} term={highlight} />
            </Link>
            {repo.channelId && (
              <MessageSquare
                className="h-3.5 w-3.5 shrink-0 text-ink-faint"
                aria-label="Has a linked channel"
              />
            )}
          </div>

          {repo.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-muted">
              <Highlight text={repo.description} term={highlight} />
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-faint">
            <span className="flex items-center gap-2">
              <AvatarStack pubkeys={people} />
              <span className="font-mono">{truncatePubkey(repo.owner)}</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Updated <RelativeTime unix={repo.createdAt} />
            </span>
          </div>
        </div>

        <ChevronRight
          className="mt-2.5 h-4 w-4 shrink-0 text-ink-faint opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </li>
  );
}
