# Backups and restore

Today nothing is backed up automatically. Until a nightly job exists (on the
[roadmap](../../HIVE_ROADMAP.md)), back up by hand before big changes.

## What to back up

| What | Where |
|---|---|
| Database | Postgres database named in `.env` |
| Files, photos, repos | `~/Library/Application Support/TheHive/s3/` |
| Secrets | `.env`, `~/Library/Application Support/TheHive/*.key` and `agents/` |

## Back up

```bash
mkdir -p ~/HiveBackups/$(date +%F)
pg_dump -Fc -d <database> -f ~/HiveBackups/$(date +%F)/hive.dump
rsync -a ~/Library/Application\ Support/TheHive/s3/ ~/HiveBackups/$(date +%F)/s3/
```

Copy the folder to an external drive. Keep secrets in an encrypted place
(for example an encrypted disk image), never in a shared folder.

## Restore

1. Stop the relay: `launchctl bootout gui/$UID/com.thehive.relay`.
2. Restore the database: `pg_restore --clean -d <database> hive.dump`.
3. Copy the `s3/` folder back.
4. Start the relay again with `scripts/hive/install-launch-agent.sh`.

Test a restore at least once; an untested backup is a hope, not a backup.
