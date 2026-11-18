/**
 * Syntax highlighting for the file viewer, via Shiki.
 *
 * Shiki returns per-line token arrays (never HTML), which the viewer renders
 * as plain React text nodes — nothing from the repo reaches innerHTML. Both
 * themes are tokenised at once with `defaultColor: false`, so each token
 * carries `--shiki-light` / `--shiki-dark` CSS variables and switching theme
 * needs no re-highlighting. Grammars load lazily, one chunk per language.
 */
import { useEffect, useState } from "react";
// Type-only: Shiki itself is loaded on first use (see `highlighter()`), so it
// stays out of the main bundle for visitors who never open a file.
import type { BundledLanguage, Highlighter, ThemedToken } from "shiki";

/** Past this, highlighting costs more than it helps; show plain text. */
const MAX_HIGHLIGHT_BYTES = 256 * 1024;
const MAX_HIGHLIGHT_LINES = 8_000;
const THEMES = { light: "github-light", dark: "github-dark" } as const;

const EXT_ALIASES: Record<string, string> = {
  mjs: "javascript",
  cjs: "javascript",
  mts: "typescript",
  cts: "typescript",
  yml: "yaml",
  h: "c",
  hpp: "cpp",
  cc: "cpp",
  kt: "kotlin",
  kts: "kotlin",
  rs: "rust",
  py: "python",
  rb: "ruby",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  md: "markdown",
  mdx: "mdx",
  json5: "json5",
  lock: "toml",
};

const NAME_ALIASES: Record<string, string> = {
  dockerfile: "docker",
  makefile: "make",
  justfile: "just",
  ".gitignore": "ini",
  ".env": "dotenv",
  ".env.example": "dotenv",
};

/** Languages we highlight; each grammar is its own lazily-loaded chunk. */
const SUPPORTED = new Set<string>([
  "astro",
  "c",
  "cpp",
  "csharp",
  "css",
  "dart",
  "diff",
  "docker",
  "dotenv",
  "elixir",
  "go",
  "graphql",
  "haskell",
  "html",
  "ini",
  "java",
  "javascript",
  "json",
  "json5",
  "jsonc",
  "jsx",
  "just",
  "kotlin",
  "less",
  "lua",
  "make",
  "markdown",
  "mdx",
  "nix",
  "php",
  "proto",
  "python",
  "ruby",
  "rust",
  "scss",
  "shellscript",
  "sql",
  "svelte",
  "swift",
  "toml",
  "tsx",
  "typescript",
  "vue",
  "xml",
  "yaml",
  "zig",
]);

const EXT_IDS: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  cs: "csharp",
  ex: "elixir",
  exs: "elixir",
  hs: "haskell",
  htm: "html",
  svg: "xml",
  patch: "diff",
};

/** Shiki language id for a file path, or null for plain text. */
export function languageForPath(path: string): BundledLanguage | null {
  const name = (path.split("/").pop() ?? path).toLowerCase();
  const byName = NAME_ALIASES[name];
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot + 1) : "";
  const candidate = byName ?? EXT_ALIASES[ext] ?? EXT_IDS[ext] ?? ext;
  return SUPPORTED.has(candidate) ? (candidate as BundledLanguage) : null;
}

let highlighterPromise: Promise<Highlighter> | null = null;

function highlighter(): Promise<Highlighter> {
  highlighterPromise ??= import("shiki")
    .then(({ getSingletonHighlighter }) =>
      getSingletonHighlighter({
        themes: [THEMES.light, THEMES.dark],
        langs: [],
      }),
    )
    .catch((err) => {
      // Let a later file retry instead of caching the failure forever.
      highlighterPromise = null;
      throw err;
    });
  return highlighterPromise;
}

async function tokenize(
  code: string,
  lang: BundledLanguage,
): Promise<ThemedToken[][]> {
  const h = await highlighter();
  if (!h.getLoadedLanguages().includes(lang)) await h.loadLanguage(lang);
  return h.codeToTokens(code, { lang, themes: THEMES, defaultColor: false })
    .tokens;
}

/**
 * Highlighted lines for `content`, or null while loading / when the file is
 * unsupported or too large (callers render plain text in that case).
 * A newer request always wins: stale results are discarded on arrival.
 */
export function useHighlightedLines(
  content: string,
  path: string,
): ThemedToken[][] | null {
  const [result, setResult] = useState<{
    key: string;
    tokens: ThemedToken[][];
  } | null>(null);
  const lang = languageForPath(path);
  const key = `${path}\u0000${content}`;
  const eligible =
    lang !== null &&
    content.length <= MAX_HIGHLIGHT_BYTES &&
    content.split("\n", MAX_HIGHLIGHT_LINES + 1).length <= MAX_HIGHLIGHT_LINES;

  useEffect(() => {
    if (!eligible || !lang) return;
    let current = true;
    const code = content.endsWith("\n") ? content.slice(0, -1) : content;
    tokenize(code, lang)
      .then((tokens) => {
        if (current) setResult({ key, tokens });
      })
      .catch((err) => {
        // Highlighting is cosmetic: fall back to plain text, but say why.
        console.warn("[highlight] falling back to plain text", err);
      });
    return () => {
      current = false;
    };
  }, [content, eligible, key, lang]);

  return eligible && result?.key === key ? result.tokens : null;
}

/** Inline style for a token: both theme colours as CSS variables. */
export function tokenStyle(token: ThemedToken): React.CSSProperties {
  return (token.htmlStyle ?? {}) as React.CSSProperties;
}
