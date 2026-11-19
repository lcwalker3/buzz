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
- [ ] Turn media on (`HIVE_MEDIA_READ_MODE`) and verify an image upload
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
- [ ] Replace in-app Buzz bee art: onboarding wordmark, flying bees on the
      welcome screen, `BuzzIcons` bee, web invite `mark.svg` and bee field
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
