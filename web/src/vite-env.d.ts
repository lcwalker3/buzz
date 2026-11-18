/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional relay URL override (see `shared/lib/relay-url.ts`). */
  readonly VITE_RELAY_URL?: string;
  /** Optional general download page for The Hive, shown on invite pages. */
  readonly VITE_HIVE_DOWNLOAD_URL?: string;
  /** Optional iOS install link (e.g. TestFlight), shown on invite pages. */
  readonly VITE_HIVE_IOS_URL?: string;
  /** Optional Android install link, shown on invite pages. */
  readonly VITE_HIVE_ANDROID_URL?: string;
  /** @deprecated Older name for `VITE_HIVE_DOWNLOAD_URL`; still read. */
  readonly VITE_APP_DOWNLOAD_URL?: string;
}
