/**
 * Markdown as code hosts render it: relative links open the linked file
 * inside this browser (on the same branch), and headings get anchors so a
 * section can be shared by URL.
 */
import { Link as LinkIcon } from "lucide-react";
import { isValidElement, type ReactNode, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { type BrowseState, browseSearch } from "../browse-search";

/** Shared prose styling for rendered Markdown (README and .md files). */
export const proseClass =
  "prose prose-sm dark:prose-invert max-w-none prose-headings:tracking-tight prose-headings:scroll-mt-20 prose-a:text-ink prose-a:decoration-honey prose-a:underline-offset-4 prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-hover prose-code:px-1 prose-code:py-0.5 prose-code:font-normal prose-pre:bg-panel-muted prose-pre:text-ink prose-pre:border prose-pre:border-line";

/** Heading ids are prefixed so README text can't collide with page ids. */
const ANCHOR_PREFIX = "md-";

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return textOf(node.props.children);
  return "";
}

/** GitHub-style slug: lowercase, punctuation dropped, spaces → dashes. */
export function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-");
}

/**
 * Resolve a Markdown href against the folder holding the document.
 * Returns a repo path (no leading slash), or null for anything that isn't a
 * same-repo relative link (external URLs, mailto:, pure #anchors).
 */
export function resolveRepoHref(
  href: string,
  baseDir: string,
): { path: string; isDir: boolean; hash: string } | null {
  if (!href || href.startsWith("#") || href.startsWith("//")) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return null;
  const [beforeHash, hash = ""] = href.split("#", 2);
  const pathPart = beforeHash.split("?")[0];
  const isDir = pathPart.endsWith("/");
  const fromRoot = pathPart.startsWith("/");
  const parts = (fromRoot ? [] : baseDir.split("/").filter(Boolean)).concat(
    pathPart.split("/"),
  );
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(decodeURIComponent(part));
  }
  return { path: out.join("/"), isDir, hash };
}

function makeHeading(level: 1 | 2 | 3 | 4) {
  const Tag = `h${level}` as const;
  return function Heading({ children }: { children?: ReactNode }) {
    const id = `${ANCHOR_PREFIX}${slugify(textOf(children))}`;
    return (
      <Tag id={id} className="group relative">
        <a
          href={`#${id}`}
          aria-label={`Link to section: ${textOf(children)}`}
          className="absolute top-1/2 -left-5 -translate-y-1/2 text-ink-faint no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <LinkIcon className="h-3.5 w-3.5" aria-hidden />
        </a>
        {children}
      </Tag>
    );
  };
}

const HEADINGS = {
  h1: makeHeading(1),
  h2: makeHeading(2),
  h3: makeHeading(3),
  h4: makeHeading(4),
} satisfies Components;

export function RepoMarkdown({
  content,
  repoId,
  baseDir,
  browse,
}: {
  content: string;
  repoId: string;
  /** Folder that holds the Markdown file ("" for the repo root). */
  baseDir: string;
  browse: BrowseState;
}) {
  const components = useMemo<Components>(
    () => ({
      ...HEADINGS,
      a({ href = "", children }) {
        if (href.startsWith("#")) {
          return <a href={`#${ANCHOR_PREFIX}${href.slice(1)}`}>{children}</a>;
        }
        const target = resolveRepoHref(href, baseDir);
        if (!target) {
          const safe = /^(https?:|mailto:)/i.test(href) ? href : undefined;
          return (
            <a href={safe} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          );
        }
        // Section links into Markdown use our heading prefix; anything else
        // (e.g. `#L12` on a code file) passes through unchanged.
        const isMarkdownTarget =
          !target.path || /\.(md|mdx|markdown)$/i.test(target.path);
        const hash = target.hash
          ? isMarkdownTarget
            ? `${ANCHOR_PREFIX}${target.hash}`
            : target.hash
          : undefined;
        if (!target.path) {
          return (
            <Link
              to="/repos/$repoId"
              params={{ repoId }}
              search={browseSearch(browse)}
              hash={hash}
            >
              {children}
            </Link>
          );
        }
        return (
          <Link
            to={
              target.isDir ? "/repos/$repoId/tree/$" : "/repos/$repoId/blob/$"
            }
            params={{ repoId, _splat: target.path }}
            search={browseSearch(browse)}
            hash={target.isDir ? undefined : hash}
          >
            {children}
          </Link>
        );
      },
    }),
    [repoId, baseDir, browse],
  );

  return (
    <Markdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </Markdown>
  );
}
