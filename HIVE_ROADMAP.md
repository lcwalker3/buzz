# The Hive — roadmap

The Hive is an independent fork of [Buzz](https://github.com/block/buzz)
(Apache-2.0). It runs on its owner's own Mac instead of hosted Buzz services.
This file is the single source of truth for what is done and what is next, so
work can stop at any point and resume later (including automatically).

**Active branch:** `hive/self-host` (PR not merged yet). Continue work there
until it is merged; then branch new work from `main`.

**Rules for whoever resumes this work**
- Read this file first; update the checkboxes and "Log" when you finish a step.
- Keep the Apache-2.0 `LICENSE` and upstream attribution. Rebrand what people
  see; keep internal identifiers (`buzz-*` crates, protocol tags, `buzz://`
  scheme, `/buzz/v1` paths) unless a step below says otherwise.
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
- [x] Web client served by the relay (`BUZZ_WEB_DIR`, `BUZZ_SERVE_GIT_WEB_GUI`)
- [ ] Phone reaches the relay via Tailscale (owner's choice): real HTTPS at
      `<mac>.<tailnet>.ts.net` through `tailscale serve`, home and away. The
      app requires wss:// with a valid cert and rejects LAN IPs, by design.
- [x] Local S3-compatible storage: versitygw (launchd `com.thehive.storage`,
      127.0.0.1:9000, data in ~/Library/Application Support/TheHive/s3).
      MinIO rejected: upstream archived, Homebrew disables it Feb 2027.
      Relay's git conformance probe passes against it.
- [ ] Turn media on (`BUZZ_MEDIA_READ_MODE`) and verify an image upload
      from the app round-trips through versitygw

## Phase 2 — Independence from hosted services
- [ ] Mobile build with Builderlab features disabled (no hosted sign-in)
- [ ] Create the owner's community on the Mac relay; join via community link
- [ ] Audit and remove/disable remaining hosted endpoints (avatars CDN, push
      gateway, release/download links, invite APIs)

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

## Phase 5 — Upgrades (ongoing)
- [ ] Ideas backlog lives here; pick, build, test, PR

## Next steps (in order)
1. Commit + PR `hive/self-host` (rebrand, self-host scripts, icon, README).
2. Owner: install Tailscale on Mac + iPhone, log in, enable MagicDNS and
   HTTPS certificates (needs the owner's admin password and account).
3. `tailscale serve --bg 3000` (HTTPS → 127.0.0.1:3000); seed the
   `<mac>.<tailnet>.ts.net` host with `RELAY_URL=wss://<that host>
   scripts/seed-local-community.sh`; set `RELAY_URL` in .env; restart relay.
4. Build iOS without Builderlab defines; install on the iPhone; owner joins
   with the `wss://` link; read the phone's pubkey from the relay log; set
   `RELAY_OWNER_PUBKEY` in .env; restart relay.
5. Web invite page: replace the Block GitHub-releases download button.

## Log
- 2026-11-18: Web repo browser rounds 1–2 (PRs #1, #2) and iOS fun features
  (PR #3, merged). App installed on the owner's iPhone as com.lcwalker3.buzz.
  Roadmap created.
- 2026-11-18: Relay running on the Mac (Postgres 17, Redis, versitygw via
  launchd); web app served at http://localhost:3000 as The Hive. User-facing
  rebrand of web + iOS, new icon, README. Auto-resume task
  `the-hive-continue-work` runs every 4 h while the Claude app is open.
