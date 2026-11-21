# Running the server

Everything runs on your Mac as background services that start at login.

| Service | What it is | Check it |
|---|---|---|
| PostgreSQL 17 | Database (messages, members, channels) | `brew services list` |
| Redis | Live updates and presence | `brew services list` |
| Storage (versitygw) | Files, photos, git objects, at `127.0.0.1:9000` | `launchctl print gui/$UID/com.thehive.storage` |
| Relay | The Hive server and web app, at `127.0.0.1:3000` | `curl -s http://127.0.0.1:3000/ -o /dev/null -w '%{http_code}\n'` |

Check everything at once with `scripts/hive/doctor.sh`: it lists each
service and setting and says what to fix.

Only `127.0.0.1` is used, so nothing is open to your Wi-Fi or the internet.
Your phone reaches the relay through Tailscale (see
[Phone and remote access](remote-access.md)).

## Where things are

- Settings and secrets: `.env` in the repo root (gitignored).
- Logs: `~/Library/Logs/TheHive/` (`relay.log`, storage log).
- Data: `~/Library/Application Support/TheHive/` (files under `s3/`) and the
  Postgres data directory (`brew --prefix`/var/postgresql@17).

## Restart the relay

```bash
launchctl kickstart -k gui/$UID/com.thehive.relay
```

Then watch the log for errors:

```bash
tail -f ~/Library/Logs/TheHive/relay.log
```

## Update to new code

1. Pull or merge the new code.
2. Rebuild the relay: `cargo build --release -p buzz-relay`.
3. Rebuild the web app if it changed: `cd web && pnpm install && pnpm build`.
4. Restart the relay (above). Database changes apply on start.

**Important:** after changing setting *names* in `.env` (for example the
`BUZZ_*` → `HIVE_*` rename), rebuild the relay before restarting. An old
binary does not know the new names and will stop with "must be set".

## Install or reinstall the services

```bash
scripts/hive/install-storage-agent.sh
scripts/hive/install-launch-agent.sh
```
