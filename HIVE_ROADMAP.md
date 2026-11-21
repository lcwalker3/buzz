# The Hive — roadmap

The Hive is an independent fork of [Buzz](https://github.com/block/buzz)
(Apache-2.0). It runs on its owner's own Mac instead of hosted Buzz services.
This file is the single source of truth for what is done and what is next, so
work can stop at any point and resume later (including automatically).

**Active branch:** `hive/self-host` (PR not merged yet). Continue work there
until it is merged; then branch new work from `main`.

**Rules for whoever resumes this work**
- Read this file first; update the checkboxes and "Log" when you finish a step.
- Keep the Apache-2.0 `LICENSE` and an attribution line ("based on Buzz by
  Block, Inc."). Owner decision (2026-11-18): remove EVERY other "buzz" —
  display name "The Hive"; code/settings/protocol use `hive` (Dart package
  `the_hive`, because `hive` is an existing pub.dev package). Do it in the
  Phase 6 order below; the app must build and pass tests after each step.
- Never point anything at hosted Buzz / Builderlab / Block services.
- Never commit secrets (`.env`, keys, tokens). `.env` is gitignored.
- Work on a branch, commit with `git commit -s`, open PRs into
  `lcwalker3/buzz` `main` only (never `block/buzz`).
- Test before claiming done: web `tsc` + `biome` + build; mobile
  `dart format` + `flutter analyze` + relevant `flutter test`; relay builds.

## Phase 1 — Self-host on the Mac
- [x] PostgreSQL 17 + Redis via Homebrew services (start at login)
- [x] `.env` for local relay: random DB password, gitignored (no hosted push
      gateway, media off for now)
- [x] Build and run `buzz-relay` from source; migrations applied
- [x] Relay kept running (launchd agent `com.thehive.relay`, restart on
      failure, 15 s throttle); bound to 127.0.0.1:3000 only
- [x] Web client served by the relay (`HIVE_WEB_DIR`, `HIVE_SERVE_GIT_WEB_GUI`)
- [ ] Phone reaches the relay via Tailscale (owner's choice): real HTTPS at
      `<mac>.<tailnet>.ts.net` through `tailscale serve`, home and away. The
      app requires wss:// with a valid cert and rejects LAN IPs, by design.
- [x] Local S3-compatible storage: versitygw (launchd `com.thehive.storage`,
      127.0.0.1:9000, data in ~/Library/Application Support/TheHive/s3).
      MinIO rejected: upstream archived, Homebrew disables it Feb 2027.
      Relay's git conformance probe passes against it.
- [ ] Turn media on (set `HIVE_S3_*` to versitygw; note `HIVE_MEDIA_READ_MODE`
      only controls revoked-media enforcement, not uploads) and verify an image upload
      from the app round-trips through versitygw

## Phase 2 — Independence from hosted services
- [ ] Mobile build with Builderlab features disabled (no hosted sign-in)
- [ ] Create the owner's community on the Mac relay; join via community link
- [ ] Audit and remove/disable remaining hosted endpoints (avatars CDN, push
      gateway, release/download links, invite APIs)
      - [x] Web invite page: Block release/App Store/Play links and the
            GitHub releases API call removed
      - [x] Mobile avatars CDN: a self-hosted (Nostr-only) build no longer
            resolves agent cards to Builderlab's CloudFront CDN

## Phase 3 — Rebrand to The Hive (user-facing)
- [x] Mobile app display name, iOS bundle id (com.lcwalker3.thehive), team,
      permission prompts, 51 user-visible strings via `lib/shared/brand.dart`
      (User-Agent and desktop-app references intentionally kept as Buzz)
- [x] Web client title, header, empty states, invite page copy
      (`web/src/shared/brand.ts`); smoke tests updated
- [x] App icon: original honeycomb (`branding/the-hive-icon.svg`), rendered
      to all iOS sizes and the web app icon
- [x] Replace in-app Buzz bee art: onboarding wordmark, welcome screen now
      drifts honeycomb cells, loaders and pull-to-refresh use a pulsing
      honeycomb mark that fills with honey, 🐝 emoji replaced, web invite
      `mark.svg` and cell field (no bees left in the apps)
- [x] README front page (The Hive header, self-hosting table, Buzz
      attribution); keep license

## Phase 4 — Better dependencies
Hosted services replaced: Builderlab sign-in → own relay keys; Block push
gateway → off (own gateway later, optional); avatars CDN → removed; Docker →
Homebrew services; S3 → local MinIO.
- [ ] Library review, one at a time with tests (never bulk-bump): 134 Flutter
      packages have newer versions; check web/npm and Rust advisories too
      (`cargo deny`, `pnpm audit`)
      - [x] `seroval` 1.5.4 → 1.8.1 (web router runtime; fixes 1 critical +
            4 high advisories). Lockfile-only; still within router-core's
            `^1.5.4` range.
      - [x] `nanoid` 3.3.16/3.3.17 → 3.3.20 (via postcss in web, admin-web,
            desktop; fixes 1 high advisory). Lockfile-only.
      - [x] `postcss` 8.5.19 → 8.5.26 (admin-web's vite; fixes 1
            moderate advisory). Lockfile-only; deduped onto the 8.5.26 copy
            web already used.
      - [x] `source-map-js` 1.2.1 → 1.2.2 (via postcss/css-tree in web,
            admin-web, desktop; fixes 1 high advisory). Lockfile-only.
      - [x] `vite` 8.0.16 → 8.1.6 (shared by web, admin-web, desktop;
            fixes 2 high + 4 moderate + 1 low advisories). Lockfile-only;
            brings rolldown 1.0.3 → 1.1.8 and its wasm helpers along.
      - [x] `postcss-selector-parser` 6.0.10 → 6.1.5 (web's
            `@tailwindcss/typography`; fixes 1 moderate advisory). Typography
            pins 6.0.10 exactly, so this is a scoped pnpm override in
            `pnpm-workspace.yaml`; built CSS is byte-identical.
      - [x] `vitest` 4.1.11 → 4.1.12 (admin-web test runner; its exact
            pin on `@vitest/mocker` fixes 2 moderate advisories).
            Lockfile-only; within admin-web's `^4.1.1`.
      - [x] Rust: `cargo deny check advisories` is clean (all remaining
            RUSTSEC hits are documented ignores in `deny.toml`). Yanked
            `async-executor` 1.14.0 → 1.14.1 (via zbus in the dev-only
            `buzz-mesh-smoke` path; not linked into the relay).
            Lockfile-only.
      - [x] Rust: yanked `nostr-sdk` 0.45.1 → 0.45.6 (via mesh-llm, only
            under the dev-only `buzz-mesh-smoke`). Lockfile-only, one
            package; no yanked crates remain.
      - [x] Rust: dropped the stale `RUSTSEC-2026-0381` (webpki-roots)
            ignore from `deny.toml`; the advisory no longer matches the
            lockfile, so `cargo deny` warned about an unused ignore.
      - [x] Flutter: `crypto` 3.0.7 → 3.0.8 (direct dependency used for
            hashing in relay auth, media upload, NIP-OA). Lockfile-only;
            within `^3.0.7`.
      - [x] Flutter: `clock` 1.1.2 → 1.1.3 (direct dependency for
            testable time in presence cache and Your Hive stats).
            Lockfile-only; within its existing constraint.
      - [x] Flutter: `intl` 0.20.2 → 0.20.3 (date/number formatting).
            Lockfile-only.
      - [x] Flutter: `shared_preferences` 2.5.5 → 2.5.6 (app settings,
            read state, theme, community and relay choices). Lockfile-only;
            the platform packages (`_android`, `_foundation`) were left as is.

## Phase 6 — Remove every "buzz" (owner decision 2026-11-18)
Scope at start: ~45k occurrences in 3,324 files, 30 crates, ~1,400 paths.
One step per PR; build + tests green before ticking. Never rename the
iOS keychain access group / app group VALUES (that would lose the identity
stored on the phone) — only names in code.
- [x] R1 Settings: `BUZZ_*` env vars → `HIVE_*` (relay, admin, scripts,
      launchd scripts, .env.example, docs). Update the owner's local .env in
      the same step and restart the relay.
- [ ] R2 Rust: crates `buzz-*` → `hive-*` (package names, dirs, `buzz_*` →
      `hive_*` paths), binaries `hive-relay`, `hive-admin`, `hive` CLI;
      update scripts/hive/* and the launchd agents to the new binaries.
- [ ] R3 Wire/protocol names: tags (`buzz-channel`, `buzz-git`, …), `/buzz/v1`
      paths, `buzz://` → `hive://`, Redis `buzz:` prefixes, NIP docs. Relay +
      mobile + web + sdk change together. Fresh DB is fine to reset, but ask
      the owner before deleting any data.
- [ ] R4 Mobile: Dart package `buzz` → `the_hive`; Swift `Buzz*` types,
      plist key NAMES, log subsystems/queue labels; Android applicationId;
      `BuzzIcons` → `HiveIcons`; relay User-Agent → `Hive-Mobile`.
- [ ] R5 Web: package name, `buzz-download` module/types, storage keys
      (migrate `buzz-web-theme` → `hive-web-theme`).
- [ ] R6 Desktop (deprecated 0.X app, ~3k files): OWNER DECISION needed —
      delete it, or rename it. Recommendation: delete.
- [ ] R7 Remaining file/dir names and docs (README upstream section,
      VISION_*.md, AGENTS.md, NIPs, CHANGELOGs).
- [ ] R8 Final sweep: `git grep -i buzz` only in attribution lines.

## Phase 7 — Every app flow works end to end on the Mac server
- [ ] Owner bootstrap: `RELAY_OWNER_PUBKEY` = owner's key as 64-char HEX (an
      npub crashes the relay at startup). Get it from the relay log line
      "auth denied: not a relay member" (pubkey=…) after the owner tries to
      join, or convert the npub shown in the app (Settings → Connection).
- [ ] Invites: create an invite as owner, join from a second identity/device
- [ ] Channels, DMs, threads, reactions, edits, deletes, search
- [ ] Media: turn on `*_MEDIA_READ_MODE`, upload/view photos, files, voice
- [ ] Web invite page: replace Block GitHub-releases download button
- [ ] Huddles (audio) over Tailscale
- [ ] Agents: run the agent harness on the Mac against the relay
- [ ] Push notifications: self-host the push gateway crate; NEEDS OWNER:
      APNs key (.p8) from developer.apple.com
- [ ] Repo hosting: push a git repo to the relay and browse it on the web

## Phase 7b — Operations (from the CTO review, 2026-11-18)
- [ ] Nightly backup (launchd, 03:00): `pg_dump -Fc` + rsync of
      ~/Library/Application Support/TheHive, keep 14 days; keep a copy of
      .env (relay signing key is irreplaceable) in an encrypted disk image;
      test one restore.
- [x] Log rotation for ~/Library/Logs/TheHive (10 MB × 5):
      `scripts/hive/rotate-logs.sh`, run hourly by the launchd agent
      `com.thehive.logrotate` (`scripts/hive/install-logrotate-agent.sh`).
- [ ] Run an installed copy of the relay (~/Library/Application
      Support/TheHive/bin) instead of the working checkout, so edits and
      renames can't break the running service mid-change.
- [ ] Services start only at login: decide auto-login or accept downtime
      after a reboot until login (owner decision).
- [ ] Phase 6 R3 hazards: never rename storage bucket NAMES (`buzz-media`
      holds data; pin it in .env); stored events carry `buzz-*` tags (migrate
      or read both); flush or dual-read Redis `buzz:` keys; keep accepting
      `buzz://` links as an alias; update `RUST_LOG` targets with R2.

## Owner tools and safer defaults
- [x] `scripts/hive/doctor.sh`: plain-language health check of every service
      and setting (owner key, operator settings, Tailscale reachability,
      disk, logs, backup age)
- [x] `scripts/hive/backup.sh` + `install-backup-agent.sh`: database, files,
      git repos and secrets into ~/HiveBackups nightly, 14-day retention;
      restore verified into a scratch database (2026-11-18)
- [x] `scripts/hive/set-owner.sh <npub>`: converts the phone's npub to hex,
      saves RELAY_OWNER_PUBKEY, restarts the relay
- [x] Private by default: new channels default to Private; invite links
      default to one use and 7 days
- [x] Calm theme: cream welcome screen with one bee and a still honeycomb,
      warm neutrals, honey accent and default chat colour; web palette to
      match
- [x] `scripts/hive/make-desktop-app.sh`: "The Hive" on the Desktop opens the
      iPhone app in the iOS Simulator
- [x] How-to guide: docs/hive/how-to.md
- [x] Built-in community address (`HIVE_DEFAULT_COMMUNITY_URL`, set from
      RELAY_URL by the build scripts): one-tap Join on the welcome screen
- [x] `scripts/hive/install-iphone-app.sh`: release build installed on the
      paired iPhone; docs/hive/devices.md for one account on both devices
- [x] Onboarding fixes: link-field label no longer clipped, setup screens
      use the cream theme, launch screen is the honeycomb (was the Buzz bee),
      native channel sheet private by default, Honey seeded as chat colour
- [x] Startup git storage self-test sized for one Mac (8x1, was 32x3):
      372 -> 28 retry warnings per restart
- [ ] NEEDS OWNER: turn on invite-only (HIVE_REQUIRE_RELAY_MEMBERSHIP) after
      set-owner; add existing devices as members first
- [ ] NEEDS OWNER: run `scripts/hive/set-owner.sh <your npub>` and
      `scripts/hive/install-backup-agent.sh`

## Communities and knowledge base
- [x] `buzz-admin communities create` (operator-signed call to the relay's
      existing `POST /operator/communities`) so a second community can be
      added at another address, e.g. `<mac>.<tailnet>.ts.net:8443`
- [x] Knowledge base for the owner in `docs/hive/` (concepts, communities,
      server, remote access, members, agents, media, repos, backups,
      troubleshooting)

## Phase 8 — CI on the fork
- [ ] Replace Block's 31 workflows (their releases, images, signing) with
      `hive-ci.yml`: web checks + build, mobile format/analyze/test, Rust
      build/test. NEEDS OWNER: enable GitHub Actions on the fork if off.

## Phase 9 — Upgrades (ongoing)
- [ ] Ideas backlog lives here; pick, build, test, PR

## Next steps (in order)
1. ~~Commit + PR `hive/self-host`~~ Done: PR #4 (open, not merged).
   Owner: run `scripts/hive/install-logrotate-agent.sh` once to turn on
   hourly log rotation (no admin password; the auto task does not install
   new background agents on its own).
2. Owner: install Tailscale on Mac + iPhone, log in, enable MagicDNS and
   HTTPS certificates (needs the owner's admin password and account).
3. `tailscale serve --bg 3000` (HTTPS → 127.0.0.1:3000); seed the
   `<mac>.<tailnet>.ts.net` host with `RELAY_URL=wss://<that host>
   scripts/seed-local-community.sh`; set `RELAY_URL` in .env; restart relay.
4. Build iOS without Builderlab defines; install on the iPhone; owner joins
   with the `wss://` link; read the phone's pubkey from the relay log; set
   `RELAY_OWNER_PUBKEY` in .env; restart relay.
5. ~~Web invite page: replace the Block GitHub-releases download button.~~
   Done 2026-11-18 (optional `VITE_APP_DOWNLOAD_URL`; guidance text when unset).

## Log
- 2026-11-18: Web repo browser rounds 1–2 (PRs #1, #2) and iOS fun features
  (PR #3, merged). App installed on the owner's iPhone as com.lcwalker3.buzz.
  Roadmap created.
- 2026-11-18: Relay running on the Mac (Postgres 17, Redis, versitygw via
  launchd); web app served at http://localhost:3000 as The Hive. User-facing
  rebrand of web + iOS, new icon, README. Auto-resume task
  `the-hive-continue-work` runs every 4 h while the Claude app is open.
- 2026-11-18 (auto): Web invite page no longer links to Block's GitHub
  releases, App Store or Play Store, and no longer calls the GitHub API. A
  download link appears only if `VITE_APP_DOWNLOAD_URL` is set at build time;
  otherwise it says to ask the inviter. tsc, biome, vite build pass; smoke
  invite tests pass in system Chrome. Pre-existing, unrelated failure: "home
  page shows repositories section" (`getByText('Repositories')` matches 2
  elements). Playwright's bundled browsers are not installed on the Mac.
- 2026-11-18: Phase 6 R1 done (commit 7922eb13a): every `BUZZ_*` setting is
  now `HIVE_*` outside the deprecated desktop/ app; owner's .env updated and
  relay restarted on the new names.
- 2026-11-18 (auto): Log rotation: `scripts/hive/rotate-logs.sh` rotates any
  ~/Library/Logs/TheHive/*.log over 10 MiB, keeping 5 copies
  (copy-then-truncate, because launchd keeps the log open in append mode);
  `install-logrotate-agent.sh` runs it hourly. Tested on a temp folder with
  macOS /bin/bash and a writer held open across rotations; shellcheck clean.
  Not yet installed on the Mac: waiting on the owner to run the installer.
- 2026-11-18 (auto): Phase 4, first advisory fix: `seroval` 1.5.4 → 1.8.1
  (pulled in by `@tanstack/router-core`; critical GHSA for <=1.6.0 plus 4
  high). Lockfile-only change. Web tsc, biome, vite build pass; the rebuilt
  web app loads at http://localhost:3000 (home and invite pages, no console
  errors). `pnpm audit` still lists 22 advisories, mostly in vite 8.0.16 /
  postcss / nanoid (web, admin-web dev tooling) and the deprecated desktop/
  app (tiptap, markdown-it, prosemirror, zod); take them one package per run.
  Next items (Tailscale, phone install, owner pubkey) still wait on the owner.
- 2026-11-18 (auto): Phase 2 audit, avatars CDN. Found a real leak: in a
  build with no Builderlab defines (ours), `HostedEnvironment.avatarsCdnOrigin`
  fell back to `app.builderlab.xyz` and returned Builderlab's CloudFront CDN,
  so opening an agent-card link fetched from a hosted Block service. It is now
  null unless the build is a public Builderlab build; tests use a
  `debugAvatarsCdnOriginOverride`. New test proves a Nostr-only build makes no
  request (and fails against the old code). dart format (changed files),
  flutter analyze, and tests in test/shared/hosted, test/shared/deeplink and
  test/features/agents pass. Not verified on the phone. Remaining audit hits
  are tests/docs or behind build defines (push gateway is off unless
  `HIVE_PUSH_GATEWAY_URL` is set). Pre-existing on this branch, untouched:
  `dart format` flags onboarding_wordmark.dart and
  channel_detail_page_test.dart. Tailscale, phone install and owner pubkey
  still wait on the owner.
- 2026-11-18 (auto): Phase 4, `nanoid` 3.3.16/3.3.17 → 3.3.20 (high
  advisory, pulled in by postcss). Lockfile-only; an unrelated
  `@babel/runtime` bump that pnpm pulled along was removed to keep this one
  package. `pnpm install --frozen-lockfile` OK; web tsc, biome, vite build and
  admin-web vite build pass. Not checked: desktop/ (deprecated). Remaining
  Phase 2 audit hits are behind Builderlab build defines. `pnpm audit` now
  lists 23 (new advisories published since the last run); next candidates:
  vite 8.1.6, postcss 8.5.23+. Tailscale, phone install and owner pubkey
  still wait on the owner.
- 2026-11-19 (auto): Phase 4, `postcss` 8.5.19 → 8.5.26 (moderate advisory,
  admin-web's vite 8.0.16 needs `^8.5.15`). Lockfile-only: the stale copy was
  dropped so everything shares 8.5.26. Web tsc, biome, vite build pass;
  admin-web tsc, vite build pass (it has no unit tests). `pnpm audit`: 22
  advisories; postcss gone. Next candidates: `source-map-js` 1.2.2 (high,
  via postcss), then vite 8.1.6 in admin-web; the rest are mostly in the
  deprecated desktop/ app (R6 owner decision). Tailscale, phone install and
  owner pubkey still wait on the owner.
- 2026-11-19 (auto): Phase 4, `source-map-js` 1.2.1 → 1.2.2 (high advisory
  GHSA-68fv-2mgg-jv7q, 25 paths via postcss and css-tree). Lockfile-only;
  1.2.2 was published 2026-09-30. Web tsc, biome, vite build pass; admin-web
  tsc and vite build pass. Not checked: desktop/ (deprecated), web e2e
  (Playwright browsers not installed). `pnpm audit`: 21 advisories. Next
  candidate: vite 8.1.6 in admin-web. Tailscale, phone install and owner
  pubkey still wait on the owner.
- 2026-11-19 (auto): Phase 4, `vite` 8.0.16 → 8.1.6 (high advisories in
  launch-editor / `server.fs.allow`, all fixed in >=8.1.6; 8.1.6 published
  2026-10-06). Lockfile-only; one vite copy is shared by web, admin-web and
  desktop. pnpm also pulled unrelated bumps (@babel/runtime, tslib, a second
  postcss/lightningcss copy); those were trimmed so only vite and its
  rolldown subtree changed, and `pnpm install --frozen-lockfile` accepts it.
  Web tsc, biome, vite build pass; admin-web tsc, vite build, vitest pass;
  web app still serves at http://localhost:3000. Not checked: desktop/
  (deprecated), web e2e. `pnpm audit`: 16 advisories, now mostly desktop/
  (R6 owner decision) plus `@vitest/mocker` 4.1.12 (admin-web) and
  `postcss-selector-parser` 6.1.5 (web). Tailscale, phone install and owner
  pubkey still wait on the owner.
- 2026-11-19 (auto): Phase 4, `postcss-selector-parser` 6.0.10 → 6.1.5
  (moderate advisory: quadratic-time flat selector parsing; fixed in 6.1.5,
  published 2026-10-19). `@tailwindcss/typography` 0.5.20 (still its latest)
  pins 6.0.10 exactly, so the fix is a scoped override
  `@tailwindcss/typography>postcss-selector-parser: 6.1.5` in
  `pnpm-workspace.yaml`, next to the existing linkify-it override. Lockfile
  diff touches only that package. Web tsc, biome, vite build pass; the built
  CSS file is byte-identical to before. Not checked: web e2e (Playwright
  browsers not installed). `pnpm audit`: 15 advisories, all but one
  (`@vitest/mocker` 4.1.11 in admin-web, next candidate) are in the
  deprecated desktop/ app (R6 owner decision). Tailscale, phone install and
  owner pubkey still wait on the owner.
- 2026-11-19 (auto): Phase 4, `vitest` 4.1.11 → 4.1.12 in admin-web (fixes
  `@vitest/mocker` GHSA-qxg6-89mg-rqv8 and GHSA-xp26-3454-mjgp, both
  moderate; vitest pins mocker exactly, so vitest itself moves; 4.1.12
  published 2026-10-15). Lockfile-only: pnpm also bumped chai, tinyrainbow,
  obug, std-env, tinyexec, @types/estree, @jridgewell/sourcemap-codec and
  @babel/runtime; those were trimmed (the old versions satisfy 4.1.12's
  ranges), so only the 8 vitest-family packages changed, and
  `pnpm install --frozen-lockfile` accepts it. admin-web tsc, vite build,
  vitest run (no test files) pass; web tsc, biome, vite build pass.
  `pnpm audit`: 13 advisories, all in the deprecated desktop/ app (R6 owner
  decision: delete or rename it). Not checked: desktop/, web e2e. Tailscale,
  phone install and owner pubkey still wait on the owner.
- 2026-11-19 (auto): Phase 4, Rust: `cargo deny check advisories` passes;
  every remaining RUSTSEC id is an existing documented ignore. Fixed one of
  two yanked crates: `async-executor` 1.14.0 → 1.14.1 (zbus → keyring →
  mesh-llm, only under the dev-only `buzz-mesh-smoke`). Lockfile-only, one
  package. `cargo build --release -p buzz-relay` OK (relay unaffected, no
  restart needed); `cargo test -p buzz-mesh-smoke` builds and passes (it
  has no unit tests, examples compile). Next: yanked `nostr-sdk` 0.45.1 →
  0.45.6 (via mesh-llm), and the now-stale `RUSTSEC-2026-0381` ignore in
  deny.toml. Tailscale, phone install and owner pubkey still wait on the
  owner.
- 2026-11-20 (auto): Phase 4, Rust: yanked `nostr-sdk` 0.45.1 → 0.45.6
  (mesh-llm-client / mesh-llm-host-runtime, reached only through the
  dev-only `buzz-mesh-smoke`; not linked into the relay). `cargo update`
  also reshuffled `windows-sys` picks for 10 Windows-only crates; those were
  trimmed so the lockfile diff is the one package, and `cargo metadata
  --locked` accepts it. `cargo build --release --locked -p buzz-relay` OK (no
  relay change, no restart); `cargo test --locked -p buzz-mesh-smoke` passes
  (no unit tests); `cargo deny check advisories` OK with no yanked crates.
  Next: drop the now-unmatched `RUSTSEC-2026-0381` ignore in deny.toml.
  Tailscale, phone install and owner pubkey still wait on the owner.
- 2026-11-20 (auto): Phase 4, Rust: removed the `RUSTSEC-2026-0381`
  ignore (and its comment) from `deny.toml`. `cargo deny` reported it as
  `advisory-not-detected`: webpki-roots 0.26.11 is still in the lockfile (via
  tokio-tungstenite 0.28 → async-wsocket → nostr-sdk) but the advisory no
  longer flags it. `cargo deny check` (advisories, bans, licenses, sources)
  passes with no unused-ignore warnings; `cargo build --release --locked -p
  buzz-relay` OK (config-only change, no restart). Remaining Phase 4 work:
  Flutter package review (one package per run) and the 13 desktop/ npm
  advisories (R6 owner decision). Tailscale, phone install and owner pubkey
  still wait on the owner.
- 2026-11-20 (auto): Phase 4, Flutter: `crypto` 3.0.7 → 3.0.8 via
  `flutter pub upgrade crypto`; pubspec.lock is the only file changed (one
  package, no transitive moves). flutter analyze clean; flutter test for
  test/shared, test/features/agents and the channel notices journey (the
  crypto users) passes, 1,733 tests. dart format still flags only the two
  pre-existing files (onboarding_wordmark.dart, channel_detail_page_test.dart).
  Not verified on the phone. Next Flutter candidates, one per run: patch
  bumps such as `clock`, `intl`, `shared_preferences`, `url_launcher`.
  Tailscale, phone install and owner pubkey still wait on the owner.
- 2026-11-20 (auto): Phase 4, Flutter: `clock` 1.1.2 → 1.1.3 via
  `flutter pub upgrade clock` (commit f63c802c5); pubspec.lock is the only
  file changed (one package, no transitive moves). flutter analyze clean;
  flutter test for test/shared and test/features/profile (the clock users)
  passes, 1,873 tests. dart format still flags only the two pre-existing
  files. Not verified on the phone. Next Flutter candidates, one per run:
  `intl`, `shared_preferences`, `url_launcher`, `share_plus`. Tailscale,
  phone install and owner pubkey still wait on the owner.
- 2026-11-20 (auto): Phase 4, Flutter: `intl` 0.20.2 → 0.20.3 via
  `flutter pub upgrade intl`; pubspec.lock is the only file changed (one
  package, no transitive moves). flutter analyze clean; flutter test for
  test/features/channels, profile, settings (the intl users) and
  test/shared passes, 4,451 tests. dart format still flags only the two
  pre-existing files. Not verified on the phone. Next Flutter candidates,
  one per run: `shared_preferences`, `url_launcher`, `share_plus`.
  Tailscale, phone install and owner pubkey still wait on the owner.
- 2026-11-21 (auto): Phase 4, Flutter: `shared_preferences` 2.5.5 → 2.5.6
  via `flutter pub upgrade shared_preferences`; pubspec.lock is the only
  file changed (one package, no transitive moves). flutter analyze clean;
  flutter test with a 120 s per-test timeout for test/shared and every
  test/features folder that uses preferences (activity, age_gate, agents,
  channels, forum, home, profile, search, settings) passes, 4,797 tests.
  dart format still flags only the two pre-existing files. Found while
  testing: a plain `flutter test` of the whole suite hung for 48 min with
  two idle test workers and printed nothing. The hanging file was not
  identified; it is not in the folders above, and it was not checked whether
  the hang predates this bump. Worth finding on a later run (run the other
  folders, such as test/features/pairing and journeys, one at a time with
  `--timeout`). Not verified on the phone. Next Flutter candidates, one per
  run: `url_launcher`, `share_plus`. Tailscale, phone install and owner
  pubkey still wait on the owner.
