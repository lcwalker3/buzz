import { useEffect } from "react";
import { APP_NAME } from "@/shared/brand";

const BASE_TITLE = APP_NAME;

/** Set the browser tab title to "<parts> · The Hive" while mounted. */
export function useDocumentTitle(...parts: (string | null | undefined)[]) {
  const title = [...parts.filter(Boolean), BASE_TITLE].join(" · ");
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
