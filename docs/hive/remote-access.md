# Phone and remote access (Tailscale)

The iPhone app only connects over secure `wss://` with a real certificate. It
refuses plain `ws://` and home-network IP addresses on purpose. Tailscale
gives your Mac a private HTTPS name that works at home and away, without
opening anything to the internet.

## Set up (once)

1. Install Tailscale on the Mac and the iPhone; sign in to the same account
   on both. (Needs you: your account and the Mac admin password.)
2. In the Tailscale admin console, turn on **MagicDNS** and **HTTPS
   certificates**.
3. On the Mac, send HTTPS traffic to the relay:

   ```bash
   tailscale serve --bg 3000
   ```

4. Your address is `https://<mac>.<tailnet>.ts.net` (shown by
   `tailscale serve status`). Set `RELAY_URL=wss://<mac>.<tailnet>.ts.net` in
   `.env` and restart the relay.
5. In the iPhone app, join `wss://<mac>.<tailnet>.ts.net`.

## Teammates

Each teammate also needs Tailscale and access to your Mac on your tailnet
(share the machine or invite them in the Tailscale admin console). Then they
open your Hive invite link. Nobody outside your tailnet can reach The Hive.

## Check it works

- From the phone's Safari, `https://<mac>.<tailnet>.ts.net` shows The Hive web
  page.
- Turn Wi-Fi off on the phone and try again on cellular.
