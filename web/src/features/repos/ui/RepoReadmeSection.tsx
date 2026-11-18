import { BookOpen } from "lucide-react";

import type { BrowseState } from "../browse-search";
import type { ReadmeResult } from "../git-client";
import { MarkdownOutline, proseClass, RepoMarkdown } from "./RepoMarkdown";

export function RepoReadmeSection({
  readme,
  isLoading,
  repoId,
  path = "",
  browse,
}: {
  readme: ReadmeResult | null | undefined;
  isLoading: boolean;
  repoId: string;
  /** Folder the README lives in ("" for the repo root). */
  path?: string;
  browse: BrowseState;
}) {
  if (isLoading) {
    return (
      <div className="repo-card mt-6 space-y-3 p-6">
        <div className="repo-skeleton h-6 w-1/3" />
        <div className="repo-skeleton h-4 w-3/4" />
        <div className="repo-skeleton h-4 w-1/2" />
        <div className="repo-skeleton h-4 w-5/6" />
      </div>
    );
  }

  if (!readme) return null;

  return (
    <section className="repo-card mt-6">
      <div className="flex items-center justify-between gap-2 border-b border-line py-2 pr-3 pl-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <BookOpen className="h-4 w-4 text-ink-faint" aria-hidden />
          {readme.filename}
        </h2>
        <MarkdownOutline content={readme.content} />
      </div>
      <div className={`${proseClass} px-6 py-5 sm:pl-8`}>
        <RepoMarkdown
          content={readme.content}
          repoId={repoId}
          baseDir={path}
          browse={browse}
        />
      </div>
    </section>
  );
}
