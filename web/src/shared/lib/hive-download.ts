/**
 * Where people can get The Hive, set by whoever runs the relay at build time.
 * The Hive has no public app distribution, so every target is optional:
 *
 * - `VITE_HIVE_DOWNLOAD_URL`: a general download page (falls back to the
 *   older `VITE_APP_DOWNLOAD_URL`).
 * - `VITE_HIVE_IOS_URL`: an iOS install link (e.g. a TestFlight invite).
 * - `VITE_HIVE_ANDROID_URL`: an Android install link.
 *
 * Unset or non-http(s) values come back `undefined`, and the invite page hides
 * that button. Never point these at hosted Buzz / Block listings.
 */
export type HiveDownloadLinks = {
  download?: string;
  ios?: string;
  android?: string;
};

/** Accept only absolute http(s) URLs; anything else is treated as unset. */
export function hiveDownloadUrl(value: string | undefined): string | undefined {
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

/** The configured install targets for this build. */
export function hiveDownloadLinks(
  env: Partial<ImportMetaEnv> = import.meta.env,
): HiveDownloadLinks {
  return {
    download: hiveDownloadUrl(
      env.VITE_HIVE_DOWNLOAD_URL ?? env.VITE_APP_DOWNLOAD_URL,
    ),
    ios: hiveDownloadUrl(env.VITE_HIVE_IOS_URL),
    android: hiveDownloadUrl(env.VITE_HIVE_ANDROID_URL),
  };
}

/** True when at least one install target is configured. */
export function hasHiveDownloadLinks(links: HiveDownloadLinks): boolean {
  return Boolean(links.download || links.ios || links.android);
}
