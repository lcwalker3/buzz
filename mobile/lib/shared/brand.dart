/// Product name shown to people.
///
/// The Hive is an independent fork of Buzz (Apache-2.0). Internal identifiers
/// (package name, protocol tags, `buzz://` links) keep their upstream names so
/// the fork stays easy to update; only what people read uses [appName].
const appName = 'The Hive';

/// Community address built into this copy of the app, for example
/// `wss://my-mac.my-tailnet.ts.net`. Set at build time with
/// `--dart-define=HIVE_DEFAULT_COMMUNITY_URL=...`; empty in ordinary builds.
/// When set, the welcome screen offers a one-tap "Join" button for it and the
/// community link field starts filled in.
const builtInCommunityUrl = String.fromEnvironment(
  'HIVE_DEFAULT_COMMUNITY_URL',
);
