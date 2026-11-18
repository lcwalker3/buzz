import { AlertTriangle, ArrowLeft, Compass, RotateCw } from "lucide-react";
import {
  type ErrorComponentProps,
  Link,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { useBrowseState } from "@/features/repos/browse-search";
import { RepoShell } from "@/features/repos/ui/RepoShell";
import { useDocumentTitle } from "@/shared/lib/use-document-title";

function FallbackCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Compass;
  title: string;
  children: React.ReactNode;
}) {
  const browse = useBrowseState();
  useDocumentTitle(title);
  return (
    <RepoShell browse={browse}>
      <div className="repo-card mx-auto mt-8 max-w-lg px-6 py-12 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-honey-soft text-honey-ink">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold">{title}</h1>
        {children}
      </div>
    </RepoShell>
  );
}

const linkClass =
  "inline-flex items-center gap-1.5 rounded-md text-sm font-medium underline decoration-honey underline-offset-4 focus-visible:outline-2 focus-visible:outline-honey";

/** Shown for any URL that doesn't match a route. */
export function NotFoundPage() {
  return (
    <FallbackCard icon={Compass} title="Page not found">
      <p className="mt-1 text-sm text-ink-muted">
        Nothing lives at this address. The link may be old or mistyped.
      </p>
      <Link to="/" className={`${linkClass} mt-6`}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to repositories
      </Link>
    </FallbackCard>
  );
}

/**
 * Shown when a page throws while rendering. Keeps the header (so the user
 * can always navigate away) and offers a retry that re-runs the route.
 */
export function RouteErrorPage({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <FallbackCard icon={AlertTriangle} title="Something went wrong">
      <p className="mt-1 text-sm text-ink-muted">
        This page hit an unexpected error.
      </p>
      {error instanceof Error && error.message && (
        <pre className="mt-4 max-h-32 overflow-auto rounded-md bg-hover px-3 py-2 text-left font-mono text-xs whitespace-pre-wrap text-ink-muted">
          {error.message}
        </pre>
      )}
      <div className="mt-6 flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => {
            reset();
            router.invalidate();
          }}
          className={linkClass}
        >
          <RotateCw className="h-4 w-4" aria-hidden />
          Try again
        </button>
        <Link to="/" className={linkClass}>
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Repositories
        </Link>
      </div>
    </FallbackCard>
  );
}
