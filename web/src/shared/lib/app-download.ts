/**
 * Where people can get the app, set by whoever runs the relay at build time
 * (`VITE_APP_DOWNLOAD_URL`). Self-hosted builds often have no public
 * download, so this returns `undefined` when unset and the invite page shows
 * guidance instead of a link. Only http(s) URLs are accepted.
 */
export function appDownloadUrl(
  value: string | undefined = import.meta.env.VITE_APP_DOWNLOAD_URL,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}
