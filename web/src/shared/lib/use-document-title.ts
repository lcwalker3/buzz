import { useEffect } from "react";

const BASE_TITLE = "Buzz";

/** Set the browser tab title to "<parts> · Buzz" while mounted. */
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
