/**
 * Keyboard shortcuts reference, opened with `?` or the header button.
 *
 * Uses a native modal <dialog>: the browser provides the focus trap, Esc to
 * close, inert background and focus return to the opener.
 */
import { Keyboard, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

const SHORTCUTS: { keys: string[]; label: string; where: string }[] = [
  { keys: ["/"], label: "Search repositories", where: "Repository list" },
  { keys: ["t"], label: "Go to file", where: "Inside a repository" },
  { keys: ["↑", "↓"], label: "Move through results", where: "Go to file" },
  { keys: ["↵"], label: "Open the highlighted file", where: "Go to file" },
  {
    keys: ["←", "→"],
    label: "Switch Code / Commits / Branches",
    where: "Tabs",
  },
  { keys: ["Esc"], label: "Clear search or close a panel", where: "Anywhere" },
  { keys: ["?"], label: "Show this help", where: "Anywhere" },
];

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
  );
}

function openDialog(dialog: HTMLDialogElement | null) {
  if (dialog && !dialog.open) dialog.showModal();
}

export function ShortcutsHelp() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = () => openDialog(dialogRef.current);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      openDialog(dialogRef.current);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={open}
            aria-keyshortcuts="Shift+?"
            aria-label="Keyboard shortcuts"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
          >
            <Keyboard className="h-4 w-4" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
      </Tooltip>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click only; the native modal <dialog> already closes on Esc */}
      <dialog
        ref={dialogRef}
        aria-labelledby="shortcuts-title"
        className="repo-card m-auto w-[min(32rem,calc(100vw-2rem))] p-0 text-ink backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
        onClick={(e) => {
          // A click on the backdrop lands on the <dialog> element itself.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 id="shortcuts-title" className="text-sm font-semibold">
            Keyboard shortcuts
          </h2>
          <form method="dialog">
            <button
              type="submit"
              aria-label="Close"
              className="rounded p-1 text-ink-faint hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-honey"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
        <dl className="divide-y divide-line">
          {SHORTCUTS.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-4 px-5 py-2.5"
            >
              <dt className="text-sm">
                {s.label}
                <span className="block text-xs text-ink-faint">{s.where}</span>
              </dt>
              <dd className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="min-w-6 rounded-md border border-line bg-panel-muted px-1.5 py-0.5 text-center font-mono text-xs text-ink-muted shadow-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </dialog>
    </>
  );
}
