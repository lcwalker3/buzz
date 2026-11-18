/**
 * Renders a single repo blob fetched via `useGitBlob`. Designed to be safe by
 * construction: no JS/HTML execution path, no SVG-as-image (SVG can carry
 * active content; we render it as text instead), and a hard preview-size cap
 * with a download fallback for anything over the limit.
 *
 * Object URLs for image/binary are created in a local effect and revoked on
 * unmount or input change — they are never cached inside React Query results.
 */
import { Check, Copy, Download, Play, WrapText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import type { BrowseState } from "../browse-search";
import type { BlobView } from "../git-client";
import { useGitBlob, useGitHtmlDoc } from "../use-git-browse";
import { tokenStyle, useHighlightedLines } from "../highlight";
import { getMockBlob } from "../mock-repos";
import { proseClass, RepoMarkdown } from "./RepoMarkdown";
import { RepoFrame } from "./RepoDetailPage";
import { useRepoBrowse } from "./RepoNav";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

/**
 * Stable object-URL for a byte buffer. Revokes on dependency change / unmount.
 * The viewer creates one per render-lifetime — the cache layer only stores bytes.
 */
function useObjectUrl(
  bytes: Uint8Array | null,
  contentType: string,
): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!bytes) {
      setUrl(null);
      return;
    }
    // The cast normalises `Uint8Array<ArrayBufferLike>` (isomorphic-git's
    // return shape) to `Uint8Array<ArrayBuffer>` so it's accepted as a `BlobPart`
    // under strict TS lib types.
    const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], {
      type: contentType,
    });
    const next = URL.createObjectURL(blob);
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
    };
  }, [bytes, contentType]);
  return url;
}

function CopyTextButton({
  content,
  label = "Copy",
  ariaLabel,
  iconOnly = false,
}: {
  content: string;
  label?: string;
  ariaLabel?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={ariaLabel}
      className="border-line bg-panel text-ink shadow-none hover:bg-hover"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(content);
          setCopied(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast.error("Failed to copy to clipboard");
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {!iconOnly && <span>{label}</span>}
    </Button>
  );
}

/** Download for text views: encodes the decoded content back to bytes. */
function TextDownloadButton({
  content,
  filename,
}: {
  content: string;
  filename: string;
}) {
  const bytes = useMemo(() => new TextEncoder().encode(content), [content]);
  return (
    <DownloadButton
      bytes={bytes}
      contentType="text/plain;charset=utf-8"
      filename={filename}
    />
  );
}

function DownloadButton({
  bytes,
  contentType,
  filename,
}: {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
}) {
  const url = useObjectUrl(bytes, contentType);
  if (!url) return null;
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="border-line bg-panel text-ink shadow-none hover:bg-hover"
    >
      <a href={url} download={filename}>
        <Download className="h-4 w-4" />
        <span>Download</span>
      </a>
    </Button>
  );
}

/**
 * Monospace view with a line-number gutter. Each number is a link to
 * `#L<n>`; the matching row is highlighted and scrolled into view, so a line
 * can be shared by URL. The active line comes from the router's location (not
 * CSS `:target`, which misses in-app pushState navigations).
 */
function TextView({
  content,
  wrap,
  path,
}: {
  content: string;
  wrap: boolean;
  path: string;
}) {
  const tokens = useHighlightedLines(content, path);
  const lines = useMemo(() => {
    const raw = content.endsWith("\n") ? content.slice(0, -1) : content;
    return raw.split("\n").map((text, i) => ({ n: i + 1, text }));
  }, [content]);

  const hash = useRouterState({ select: (s) => s.location.hash });
  const activeLine = /^L\d+$/.test(hash) ? Number(hash.slice(1)) : null;

  useEffect(() => {
    if (activeLine === null) return;
    document
      .getElementById(`L${activeLine}`)
      ?.scrollIntoView({ block: "center" });
  }, [activeLine]);

  return (
    <div className="overflow-x-auto bg-panel py-2 font-mono text-[13px] leading-6">
      <table className="w-full border-collapse">
        <tbody>
          {lines.map((line) => (
            <tr
              key={line.n}
              id={`L${line.n}`}
              className="code-line"
              data-active={line.n === activeLine}
            >
              <td className="w-px select-none pr-4 pl-4 text-right align-top">
                <a
                  href={`#L${line.n}`}
                  className="text-ink-faint tabular-nums hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
                  aria-label={`Line ${line.n}`}
                >
                  {line.n}
                </a>
              </td>
              <td
                className={cn(
                  "pr-4 align-top text-ink",
                  wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre",
                )}
              >
                {tokens?.[line.n - 1]
                  ? tokens[line.n - 1].map((t) => (
                      <span
                        key={t.offset}
                        className="code-token"
                        style={tokenStyle(t)}
                      >
                        {t.content}
                      </span>
                    ))
                  : line.text}
                {line.text === "" && " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImageView({
  bytes,
  contentType,
  filename,
}: {
  bytes: Uint8Array;
  contentType: string;
  filename: string;
}) {
  const url = useObjectUrl(bytes, contentType);
  if (!url) return null;
  return (
    <div
      className="flex justify-center p-6"
      style={{
        backgroundImage:
          "repeating-conic-gradient(var(--hover) 0% 25%, transparent 0% 50%)",
        backgroundSize: "16px 16px",
      }}
    >
      <img
        src={url}
        alt={filename}
        className="max-h-[75vh] max-w-full object-contain"
      />
    </div>
  );
}

/**
 * Runs a repo's HTML in a sandboxed iframe.
 *
 * SECURITY — the entire trust boundary is the `sandbox` attribute below.
 * `allow-scripts` lets the page's JS run; the deliberate ABSENCE of
 * `allow-same-origin` forces the frame to an opaque (`null`) origin, so its
 * scripts CANNOT read the parent's cookies, IndexedDB, localStorage, relay
 * session, or NIP-98 auth — even though we render on the same document origin.
 * Do not add `allow-same-origin`: that would hand pushed code the user's
 * session. `srcDoc` carries the asset-inlined doc; nothing reaches the network
 * for same-repo content.
 */
const RUN_SANDBOX = "allow-scripts";

function HtmlRunView({ doc }: { doc: string }) {
  return (
    <iframe
      title="Repository page (sandboxed)"
      srcDoc={doc}
      sandbox={RUN_SANDBOX}
      className="block h-[75vh] w-full bg-white"
    />
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-6 py-10 text-center text-sm text-ink-muted">
      {children}
    </div>
  );
}

function ViewerBody({
  view,
  filename,
  filepath,
  repoId,
  browse,
  htmlDoc,
  wrap,
}: {
  view: BlobView;
  filename: string;
  filepath: string;
  repoId: string;
  browse: BrowseState;
  htmlDoc: string | null;
  wrap: boolean;
}) {
  switch (view.kind) {
    case "text":
      return <TextView content={view.content} wrap={wrap} path={filename} />;
    case "markdown":
      return (
        <div className={`${proseClass} px-6 py-5`}>
          <RepoMarkdown
            content={view.content}
            repoId={repoId}
            baseDir={filepath.split("/").slice(0, -1).join("/")}
            browse={browse}
          />
        </div>
      );
    case "html":
      // `htmlDoc` is the asset-inlined doc, present only once the user opts in
      // via "Run"; until then (and while it resolves) we show the source.
      return htmlDoc !== null ? (
        <HtmlRunView doc={htmlDoc} />
      ) : (
        <TextView content={view.content} wrap={wrap} path={filename} />
      );
    case "image":
      return (
        <ImageView
          bytes={view.bytes}
          contentType={view.contentType}
          filename={filename}
        />
      );
    case "binary":
      return (
        <Notice>
          Binary file — {formatBytes(view.sizeBytes)}. Use the Download button
          above to save it.
        </Notice>
      );
    case "too-large":
      return (
        <Notice>
          File is {formatBytes(view.sizeBytes)}, over the{" "}
          {formatBytes(view.limitBytes)} preview limit. Use the Download button
          above to save it.
        </Notice>
      );
  }
}

function lineCount(content: string): number {
  if (!content) return 0;
  const n = content.split("\n").length;
  return content.endsWith("\n") ? n - 1 : n;
}

export function RepoBlobPage() {
  const { repoId, _splat } = useParams({ from: "/repos/$repoId/blob/$" });
  const filepath = (_splat ?? "").replace(/^\/+|\/+$/g, "");
  const ctx = useRepoBrowse(repoId);
  const mockView = ctx.mock ? getMockBlob(repoId, filepath) : undefined;

  const {
    data: fetchedView,
    isLoading: isViewLoading,
    error,
  } = useGitBlob(ctx.owner, ctx.repoName, ctx.ref, filepath);
  const view = ctx.mock ? mockView : fetchedView;
  const isLoading = ctx.mock ? false : isViewLoading;

  const [running, setRunning] = useState(false);
  const [wrap, setWrap] = useState(false);
  const isHtml = view?.kind === "html";
  const hasText =
    view?.kind === "text" || view?.kind === "markdown" || view?.kind === "html";
  const { data: htmlDoc, isFetching: htmlFetching } = useGitHtmlDoc(
    ctx.owner,
    ctx.repoName,
    ctx.ref,
    filepath,
    isHtml ? view.content : "",
    running && isHtml,
  );

  const filename = basename(filepath);

  return (
    <RepoFrame ctx={ctx} path={filepath} wide>
      <div className="repo-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-panel-muted px-4 py-2.5">
          <p className="text-xs text-ink-muted tabular-nums">
            {view && hasText && (
              <>
                {lineCount(view.content)} lines
                <span aria-hidden className="mx-1.5 text-ink-faint">
                  ·
                </span>
              </>
            )}
            {view && formatBytes(view.sizeBytes)}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {view && (view.kind === "text" || (isHtml && !running)) && (
              <Button
                variant="outline"
                size="sm"
                aria-pressed={wrap}
                onClick={() => setWrap((w) => !w)}
                className={cn(
                  "border-line bg-panel text-ink shadow-none hover:bg-hover",
                  wrap && "bg-honey-soft",
                )}
              >
                <WrapText className="h-4 w-4" />
                <span>Wrap</span>
              </Button>
            )}
            <CopyTextButton
              content={filepath}
              ariaLabel="Copy file path"
              iconOnly
            />
            {view && hasText && <CopyTextButton content={view.content} />}
            {view && hasText && (
              <TextDownloadButton content={view.content} filename={filename} />
            )}
            {isHtml && (
              <Button
                size="sm"
                className="bg-ink text-page shadow-none hover:bg-ink/85"
                onClick={() => setRunning((r) => !r)}
              >
                <Play className="h-4 w-4" />
                <span>{running ? "Show source" : "Run"}</span>
              </Button>
            )}
            {view && !hasText && (
              <DownloadButton
                bytes={view.bytes}
                contentType={
                  view.kind === "image"
                    ? view.contentType
                    : "application/octet-stream"
                }
                filename={filename}
              />
            )}
          </div>
        </div>

        {ctx.repoLoading || isLoading ? (
          <div className="space-y-2 p-4">
            {["a", "b", "c", "d", "e"].map((k) => (
              <div key={k} className="repo-skeleton h-4 w-2/3" />
            ))}
          </div>
        ) : error ? (
          <p role="alert" className="px-4 py-6 text-sm text-destructive">
            Failed to load file: {(error as Error).message}
          </p>
        ) : view ? (
          <ViewerBody
            view={view}
            filename={filename}
            filepath={filepath}
            repoId={repoId}
            browse={ctx.browse}
            wrap={wrap}
            htmlDoc={running && !htmlFetching ? (htmlDoc ?? null) : null}
          />
        ) : (
          <Notice>This file doesn't exist on this branch.</Notice>
        )}
      </div>
    </RepoFrame>
  );
}
