# Phone and Mac: one account, everything in sync

Everything you see in The Hive (channels, messages, DMs, threads, reactions,
files) is stored on your Mac's server, not on the device. Any device that
joins your community shows the same thing, live. Your appearance settings,
such as chat colour, sync too.

## Install or update the apps

| Where | Command (in `~/Projects/Buzz/buzz`) |
|---|---|
| iPhone (connected to this Mac, unlocked) | `scripts/hive/install-iphone-app.sh` |
| This Mac ("The Hive" on the Desktop) | `scripts/hive/make-desktop-app.sh` |

Both have your community's address built in: the welcome screen shows
**Join lowells-macbook-pro**. Updating keeps each app's sign-in and data.

## Use the same account on both

Each device starts with its own identity. To be **you** on both, move your
key from the phone to the Mac (do this yourself; the key is your password):

1. On the iPhone: Settings → Connection → **Export private key**. Confirm
   with Face ID and AirDrop the file to your Mac.
2. Drag the file onto the Simulator window (it lands in the Files app).
3. In the Desktop app: Settings → **Sign out**, then **Join
   lowells-macbook-pro** → **Import a Nostr key** → **Choose nsec file** and
   pick it → **Import this identity**.
4. Delete the exported file from the Mac (and empty the Trash).

Now a message you send on the phone appears on the Mac within a second or
two, and the other way round.

## Check sync

Send a message in a channel on one device and watch it appear on the other.
If it does not, run `scripts/hive/doctor.sh` on the Mac.
