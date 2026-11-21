# Photos, files and voice

Files are stored on your Mac by the storage service (versitygw) under
`~/Library/Application Support/TheHive/s3/`. Nothing goes to a cloud service.

## Set up media

1. Make sure the storage service is running
   (`launchctl print gui/$UID/com.thehive.storage`).
2. In `.env`, set the storage settings so the relay uses your local storage
   (names and examples are in `.env.example`):

   ```
   HIVE_S3_ENDPOINT=http://127.0.0.1:9000
   HIVE_S3_ACCESS_KEY=<your storage access key>
   HIVE_S3_SECRET_KEY=<your storage secret key>
   HIVE_S3_BUCKET=buzz-media
   HIVE_S3_REGION=us-east-1
   HIVE_S3_ADDRESSING_STYLE=path
   ```

3. Keep the bucket names that already exist (`buzz-media`, and `buzz-git`
   for repos). Renaming a bucket hides the files already in it.
4. Restart the relay.

`HIVE_MEDIA_READ_MODE` is a separate setting: it controls whether files
removed from a channel stop being viewable (`off`, `shadow`, `enforce`). It
does not switch uploads on or off. See `docs/operator-private-media.md`
before changing it.

## Check it works

Send a photo in a channel from the phone. It should appear on a second
device, and a new file should appear under the storage folder. Then try a PDF
and a voice note.
