/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional relay URL override (see `shared/lib/relay-url.ts`). */
  readonly VITE_RELAY_URL?: string;
  /** Optional public download page for the app, shown on invite pages. */
  readonly VITE_APP_DOWNLOAD_URL?: string;
}
