# Backups and restore

`scripts/hive/backup.sh` saves the database, files, git repositories and
secrets into a dated folder in `~/HiveBackups` (only you can read it) and
keeps the last 14 days. Turn on a nightly run at 03:15 with:

```bash
scripts/hive/install-backup-agent.sh
```

To back up to an external drive instead, set `HIVE_BACKUP_DIR` (for example
`HIVE_BACKUP_DIR=/Volumes/Backup/Hive scripts/hive/backup.sh`).

## What to back up

| What | Where |
|---|---|
| Database | Postgres database named in `.env` |
| Files, photos, repos | `~/Library/Application Support/TheHive/s3/` |
| Secrets | `.env`, `~/Library/Application Support/TheHive/*.key` and `agents/` |

## Back up by hand

```bash
scripts/hive/backup.sh
```

Copy `~/HiveBackups` to an encrypted external drive from time to time. It
contains your secrets, so never put it in a shared folder.

## Restore

1. Stop the relay: `launchctl bootout gui/$UID/com.thehive.relay`.
2. Restore the database:
   `pg_restore --clean --if-exists --no-owner -d "$DATABASE_URL" ~/HiveBackups/<date>/database.dump`.
3. Copy the `s3/` and `git/` folders back into
   `~/Library/Application Support/TheHive/`.
4. Start the relay again with `scripts/hive/install-launch-agent.sh`.

Test a restore at least once; an untested backup is a hope, not a backup.
