# The Hive: how to

A short, practical guide to opening and using The Hive. For more detail, see
the [knowledge base](README.md).

## 1. Open The Hive

| Where | How |
|---|---|
| **This Mac** | Double-click **The Hive** on your Desktop. An iPhone window opens with the full app. The first launch takes a few seconds. |
| **Your iPhone** | Open The Hive app. The phone needs Tailscale switched on. To update it, connect it to the Mac and run `scripts/hive/install-iphone-app.sh`. |
| **A browser** | Go to `https://lowells-macbook-pro.tail45da68.ts.net`. The web app has the invite page and the code browser; chat is in the apps. |

The Mac must be on (asleep is fine if "Prevent automatic sleeping" is on in
Battery/Energy settings) for the phone to reach The Hive.

## 2. First-time setup (once)

1. **Join your community.** In the Desktop app, tap **Join lowells-macbook-pro**
   (your address is built in). On the phone, choose **Enter a community link**
   and use `wss://lowells-macbook-pro.tail45da68.ts.net`.
2. **Make yourself the owner.** In the app: Settings → Connection → copy your
   public key (it starts with `npub`). On the Mac, in Terminal:

   ```bash
   cd ~/Projects/Buzz/buzz
   scripts/hive/set-owner.sh npub1...your key...
   ```

   This saves it and restarts the server. Reopen the app; you now see owner
   actions such as **Invite to community**.
3. **Turn on nightly backups:**

   ```bash
   scripts/hive/install-backup-agent.sh
   ```

4. **Check everything:** `scripts/hive/doctor.sh` should end with "All good".

## 3. Same account on phone and Mac

Move your key from the phone to the Desktop app once, and both show the
same you. Steps: [Phone and Mac in sync](devices.md).

## 4. Everyday use

- **Channels.** Tap **+** → New channel. New channels are **private** by
  default (only people you add can see them). Choose **Public** if everyone
  in the community should see it.
- **Direct messages.** Start a new chat and pick one or more people.
- **Threads.** Long-press a message → Reply in thread, to keep side
  conversations tidy.
- **Reactions.** Long-press a message and pick an emoji.
- **Photos, files, voice.** Use the **+** next to the message box; hold the
  microphone for a voice note.
- **Huddles.** In a channel, start a huddle for a live audio call.
- **Search.** Use the search field at the top to find messages, people and
  channels.
- **Your colour.** Settings → Appearance → **Chat color** (Honey is the
  default), plus light or dark mode.

## 5. Invite someone

1. Make sure they can reach your Mac: invite them to your Tailscale network
   (Tailscale admin console → Share or Invite).
2. In the app: community menu → **Invite to community**. Invite links work
   **once** and last **7 days** by default; change that if you need to.
3. Send them the link privately. When they open it, they join.

## 6. Add a second community (optional)

Most people only need one community and use channels to separate topics. If
you want a completely separate space (for example family and work), follow
[Communities and workspaces](communities.md#adding-another-community).

## 7. AI agents

Agents are teammates with their own identity (CEO, CTO, Programmer). Setting
one up needs an AI provider key from you. See [AI agents](agents.md).

## 8. Keeping it healthy

| Task | Command (in `~/Projects/Buzz/buzz`) |
|---|---|
| Check everything | `scripts/hive/doctor.sh` |
| Back up now | `scripts/hive/backup.sh` (saved in `~/HiveBackups`) |
| Restart the server | `launchctl kickstart -k gui/$(id -u)/com.thehive.relay` |
| Update the Desktop app after new code | `scripts/hive/make-desktop-app.sh` |
| Update the iPhone app | `scripts/hive/install-iphone-app.sh` |
| See server errors | `tail -n 50 ~/Library/Logs/TheHive/relay.log` |

If something is wrong, run the health check first: it says what to fix. More
fixes are in [Troubleshooting](troubleshooting.md).
