/**
 * Markdown as code hosts render it: relative links open the linked file
 * inside this browser (on the same branch), and headings get anchors so a
 * section can be shared by URL.
 */
import { Link as LinkIcon, ListTree } from "lucide-react";
import {
  isValidElement,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
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

export interface OutlineItem {
  level: number;
  text: string;
  id: string;
  /** Unique even when two headings share text. */
  key: string;
}

/**
 * Headings (h1–h4) from Markdown source, skipping fenced code blocks.
 * Ids match the anchors `RepoMarkdown` renders.
 */
export function markdownOutline(content: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  const seen = new Map<string, number>();
  let fence: string | null = null;
  for (const line of content.split("\n")) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence) continue;
    const m = line.match(/^\s{0,3}(#{1,4})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    // Strip inline Markdown so the label matches the rendered heading text.
    const text = m[2]
      .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~]/g, "");
    const id = `${ANCHOR_PREFIX}${slugify(text)}`;
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    items.push({ level: m[1].length, text, id, key: `${id}:${n}` });
  }
  return items;
}

/** Collapsible outline of a document's headings (shown for 3+ headings). */
export function MarkdownOutline({ content }: { content: string }) {
  const items = useMemo(() => markdownOutline(content), [content]);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Esc (returning focus to the toggle) or a click outside.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (items.length < 3) return null;
  const minLevel = Math.min(...items.map((i) => i.level));

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-muted hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
      >
        <ListTree className="h-3.5 w-3.5" aria-hidden />
        Outline
      </button>
      {open && (
        <nav
          id={listId}
          aria-label="Document outline"
          className="repo-card absolute top-full right-0 z-20 mt-1 max-h-80 w-72 overflow-y-auto py-1.5 shadow-lg"
        >
          <ul>
            {items.map((item) => (
              <li key={item.key}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  style={{
                    paddingLeft: `${0.75 + (item.level - minLevel) * 0.875}rem`,
                  }}
                  className="block truncate py-1 pr-3 text-sm text-ink-muted hover:bg-hover hover:text-ink focus-visible:bg-hover focus-visible:outline-none"
                >
                  {item.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
