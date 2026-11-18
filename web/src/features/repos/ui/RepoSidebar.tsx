import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  GitBranch,
  MessageSquare,
  Tag,
  Terminal,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { cn } from "@/shared/lib/cn";
import { truncatePubkey } from "@/shared/lib/pubkey";
import { RelativeTime } from "@/shared/ui/relative-time";
import type { RepoRefs } from "../use-repo-refs";
import type { Repo } from "../use-repos";
import { ConnectButton } from "./ConnectButton";
import { PubkeyAvatar } from "./PubkeyAvatar";
import { SectionLabel } from "./RepoShell";

/** Only http(s) links are rendered — blocks `javascript:` and friends. */
export function safeWebUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return /^https?:$/.test(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

type CloneMode = "url" | "command";

function ClonePanel({ urls }: { urls: string[] }) {
  const [mode, setMode] = useState<CloneMode>("command");
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }

  return (
    <div className="repo-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Terminal className="h-4 w-4 text-ink-faint" aria-hidden />
          Clone
        </span>
        <fieldset className="flex rounded-md bg-hover p-0.5 text-xs">
          <legend className="sr-only">Clone format</legend>
          {(["command", "url"] as const).map((m) => (
            <label
              key={m}
              className={cn(
                "cursor-pointer rounded px-2 py-0.5 font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-honey",
                mode === m
                  ? "bg-panel text-ink shadow-xs"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <input
                type="radio"
                name="clone-mode"
                value={m}
                checked={mode === m}
                onChange={() => setMode(m)}
                className="sr-only"
              />
              {m === "command" ? "git" : "URL"}
            </label>
          ))}
        </fieldset>
      </div>
      <ul className="space-y-2 p-3">
        {urls.map((url) => {
          const text = mode === "command" ? `git clone ${url}` : url;
          return (
            <li
              key={url}
              className="flex items-center gap-2 rounded-md border border-line bg-panel-muted py-1.5 pr-1.5 pl-3"
            >
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink">
                {text}
              </code>
              <button
                type="button"
                onClick={() => copy(text)}
                className="shrink-0 rounded p-1.5 text-ink-faint hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
                aria-label={
                  mode === "command" ? "Copy clone command" : "Copy clone URL"
                }
              >
                {copied === text ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-ink-muted">
      <Icon className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
      {children}
    </li>
  );
}

export function RepoSidebar({
  repo,
  refs,
}: {
  repo: Repo;
  refs: RepoRefs | undefined;
}) {
  const web = safeWebUrl(repo.webUrl);
  const people = [
    repo.owner,
    ...repo.contributors.filter((c) => c !== repo.owner),
  ];
  const branches = refs?.branches.length ?? 0;
  const tags = refs?.tags.length ?? 0;

  return (
    <div className="space-y-6">
      <ConnectButton className="w-full" />

      {repo.cloneUrls.length > 0 && <ClonePanel urls={repo.cloneUrls} />}

      <div>
        <SectionLabel>About</SectionLabel>
        <ul className="space-y-2">
          <Stat icon={GitBranch}>
            {branches} {branches === 1 ? "branch" : "branches"}
          </Stat>
          <Stat icon={Tag}>
            {tags} {tags === 1 ? "tag" : "tags"}
          </Stat>
          <Stat icon={Clock}>
            Updated <RelativeTime unix={repo.createdAt} />
          </Stat>
          {web && (
            <Stat icon={ExternalLink}>
              <a
                href={web}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-ink underline decoration-honey underline-offset-4 hover:decoration-2"
              >
                {new URL(web).host}
              </a>
            </Stat>
          )}
          {repo.channelId && (
            <Stat icon={MessageSquare}>
              <a
                href={`/channels/${repo.channelId}`}
                className="text-ink underline decoration-honey underline-offset-4 hover:decoration-2"
              >
                View channel
              </a>
            </Stat>
          )}
        </ul>
      </div>

      <div>
        <SectionLabel>
          <Users className="h-3.5 w-3.5" aria-hidden />
          People · {people.length}
        </SectionLabel>
        <ul className="space-y-1.5">
          {people.map((pk) => (
            <li key={pk} className="flex items-center gap-2.5">
              <PubkeyAvatar pubkey={pk} size="sm" />
              <span className="truncate font-mono text-xs text-ink-muted">
                {truncatePubkey(pk)}
              </span>
              {pk === repo.owner && (
                <span className="ml-auto rounded-full bg-honey-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-honey-ink">
                  Owner
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
