import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import buzzAppIcon from "@/assets/app-icon@3x.png";
import { relayWsUrl } from "@/shared/lib/relay-url";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { type BrowseState, browseSearch } from "../browse-search";

function relayHost(): string {
  try {
    return new URL(relayWsUrl()).host;
  } catch {
    return "";
  }
}

/** Page chrome for every repo-browser screen: header + centred content. */
export function RepoShell({
  browse,
  children,
  sidebar,
}: {
  browse: BrowseState;
  children: ReactNode;
  sidebar?: ReactNode;
}) {
  const host = relayHost();
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-page text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-page/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            search={browseSearch(browse, { ref: null })}
            className="flex items-center gap-2.5 rounded-md outline-offset-4 focus-visible:outline-2 focus-visible:outline-honey"
          >
            <span
              className="h-7 w-7 overflow-hidden bg-black"
              style={{ borderRadius: "22.37%" }}
            >
              <img alt="" className="h-full w-full" src={buzzAppIcon} />
            </span>
            <span className="text-sm font-semibold tracking-tight">Buzz</span>
          </Link>
          {host && (
            <>
              <span aria-hidden className="text-ink-faint">
                /
              </span>
              <span className="truncate text-sm text-ink-muted">{host}</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-4 py-8 sm:px-6">
        <div className="min-w-0 flex-1">{children}</div>
        {sidebar && (
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-22">{sidebar}</div>
          </aside>
        )}
      </div>
    </div>
  );
}

/** Small uppercase section label used in sidebars. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
      {children}
    </h3>
  );
}
