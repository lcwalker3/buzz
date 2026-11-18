/// Loads "Your Hive": weekly stats and badges for the signed-in user.
///
/// Fetches the user's own recent events with ONE bounded relay query, and only
/// when the Hive page is open (autoDispose) — never on startup, reconnect or
/// in the background. Earned badges are remembered on the device per relay and
/// identity, so they show instantly, survive offline, and never disappear when
/// the activity that earned them ages out of the query window.
library;

import 'dart:convert';

import 'package:clock/clock.dart';
import 'package:flutter/foundation.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../community/community_provider.dart';
import '../relay/nostr_models.dart';
import '../relay/relay_provider.dart';
import '../relay/relay_session.dart';
import '../theme/theme_provider.dart';
import 'hive_stats.dart';

/// The signed-in user's pubkey for the active community, if any.
final hivePubkeyProvider = Provider<String?>((ref) {
  final active = ref.watch(activeCommunityProvider).value;
  final config = ref.watch(relayConfigProvider);
  final pubkey = active?.pubkey ?? pubkeyFromNsec(config.nsec);
  return pubkey?.trim().toLowerCase();
});

/// Badge id → when it was first earned (seconds since epoch).
typedef EarnedBadges = Map<HiveBadge, int>;

String _storeKey(String relay, String pubkey) =>
    'buzz.hive.badges.v1|$relay|$pubkey';

/// Device-local record of earned badges for one relay + identity.
class HiveBadgeStore {
  final SharedPreferences _prefs;
  final String _key;

  HiveBadgeStore(this._prefs, {required String relay, required String pubkey})
    : _key = _storeKey(relay, pubkey);

  EarnedBadges read() {
    final raw = _prefs.getString(_key);
    if (raw == null) return {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return {};
      final out = <HiveBadge, int>{};
      decoded.forEach((id, at) {
        final badge = id is String ? HiveBadge.byId(id) : null;
        if (badge != null && at is int) out[badge] = at;
      });
      return out;
    } on FormatException {
      return {};
    }
  }

  /// Adds [badges] (keeping existing earn times) in one write.
  Future<EarnedBadges> add(Set<HiveBadge> badges, {required int at}) async {
    final current = read();
    final missing = badges.where((b) => !current.containsKey(b));
    if (missing.isEmpty) return current;
    final next = {...current, for (final b in missing) b: at};
    final ok = await _prefs.setString(
      _key,
      jsonEncode({for (final e in next.entries) e.key.id: e.value}),
    );
    if (!ok) throw StateError('Could not save earned badges');
    return next;
  }
}

final hiveBadgeStoreProvider = Provider<HiveBadgeStore?>((ref) {
  final pubkey = ref.watch(hivePubkeyProvider);
  if (pubkey == null) return null;
  return HiveBadgeStore(
    ref.watch(savedPrefsProvider),
    relay: ref.watch(relayConfigProvider).baseUrl,
    pubkey: pubkey,
  );
});

/// Badges already earned on this device — available offline, instantly.
final storedHiveBadgesProvider = Provider.autoDispose<EarnedBadges>((ref) {
  return ref.watch(hiveBadgeStoreProvider)?.read() ?? {};
});

@immutable
class HiveSnapshot {
  final WeeklyStats week;
  final EarnedBadges earned;

  /// Badges earned by this load (to celebrate once).
  final Set<HiveBadge> newlyEarned;

  /// True when the query hit [hiveQueryLimit]: older activity was left out,
  /// so some badges may not be judged yet.
  final bool truncated;

  const HiveSnapshot({
    required this.week,
    required this.earned,
    required this.newlyEarned,
    required this.truncated,
  });
}

/// Builds the user's own-event filters for the lookback window.
@visibleForTesting
List<NostrFilter> hiveFilters(String pubkey, {required DateTime now}) {
  final since = now.subtract(hiveLookback).millisecondsSinceEpoch ~/ 1000;
  return [
    NostrFilter(
      kinds: EventKind.channelMessageEventKinds,
      authors: [pubkey],
      since: since,
      limit: hiveQueryLimit,
    ),
    NostrFilter(
      kinds: [EventKind.reaction],
      authors: [pubkey],
      since: since,
      limit: hiveQueryLimit,
    ),
  ];
}

/// Runs a one-shot relay query. The network boundary for the Hive page, so
/// tests can replace it without faking the whole relay session.
typedef HiveQuery = Future<List<NostrEvent>> Function(List<NostrFilter>);

final hiveQueryProvider = Provider<HiveQuery>((ref) {
  final session = ref.read(relaySessionProvider.notifier);
  return session.queryRelay;
});

final hiveSnapshotProvider = FutureProvider.autoDispose<HiveSnapshot>((
  ref,
) async {
  final pubkey = ref.watch(hivePubkeyProvider);
  final store = ref.watch(hiveBadgeStoreProvider);
  if (pubkey == null || store == null) {
    throw StateError('Sign in to a community to see your hive');
  }
  final now = clock.now();
  final events = await ref.read(hiveQueryProvider)(
    hiveFilters(pubkey, now: now),
  );
  // The relay is not trusted to honour `authors`; count only our own events.
  final own = events.where((e) => e.pubkey.toLowerCase() == pubkey).toList();

  final before = store.read();
  final earned = await store.add(
    qualifyingBadges(own),
    at: now.millisecondsSinceEpoch ~/ 1000,
  );
  ref.invalidate(storedHiveBadgesProvider);

  final messages = own
      .where((e) => EventKind.channelMessageEventKinds.contains(e.kind))
      .length;
  final reactions = own.where((e) => e.kind == EventKind.reaction).length;
  return HiveSnapshot(
    week: computeWeeklyStats(own, now: now),
    earned: earned,
    newlyEarned: earned.keys.toSet().difference(before.keys.toSet()),
    truncated: messages >= hiveQueryLimit || reactions >= hiveQueryLimit,
  );
});
