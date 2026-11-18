import 'package:buzz/shared/fun/hive_provider.dart';
import 'package:buzz/shared/fun/hive_stats.dart';
import 'package:buzz/shared/relay/nostr_models.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _me = 'a1b2c3';
final _parent = 'e' * 64;

var _seq = 0;

/// An event authored by [_me] at a local [time].
NostrEvent _ev(
  DateTime time, {
  int kind = EventKind.streamMessageV2,
  String channel = 'general',
  bool reply = false,
}) => NostrEvent(
  id: 'id${_seq++}',
  pubkey: _me,
  createdAt: time.millisecondsSinceEpoch ~/ 1000,
  kind: kind,
  tags: [
    ['h', channel],
    if (reply) ['e', _parent, '', 'reply'],
  ],
  content: 'hi',
  sig: 'sig',
);

void main() {
  // Wednesday noon, local time.
  final now = DateTime(2026, 11, 18, 12);
  DateTime daysAgo(int d, {int hour = 12}) =>
      DateTime(now.year, now.month, now.day - d, hour);

  group('computeWeeklyStats', () {
    test('counts messages, reactions, replies and active days in 7 days', () {
      final stats = computeWeeklyStats([
        _ev(daysAgo(0)),
        _ev(daysAgo(0), reply: true),
        _ev(daysAgo(2), kind: EventKind.reaction),
        _ev(daysAgo(6), kind: EventKind.forumComment),
        _ev(daysAgo(7)), // outside the week
        _ev(daysAgo(1), kind: EventKind.presenceUpdate), // not activity
      ], now: now);

      expect(stats.messages, 3);
      expect(stats.reactions, 1);
      expect(stats.threadReplies, 2); // NIP-10 reply + forum comment
      expect(stats.activeDays, 3);
      expect(stats.perDay, [1, 0, 0, 0, 1, 0, 2]);
      expect(stats.isEmpty, isFalse);
    });

    // Table: activity days (days ago) → expected streak.
    final streaks = <String, (List<int>, int)>{
      'no activity': ([], 0),
      'today only': ([0], 1),
      'yesterday only still counts': ([1], 1),
      'three in a row through today': ([0, 1, 2], 3),
      'gap breaks it': ([0, 2, 3], 1),
      'run ending yesterday': ([1, 2, 3, 4], 4),
      'old run does not count': ([3, 4, 5], 0),
    };
    for (final MapEntry(key: name, value: (days, expected))
        in streaks.entries) {
      test('streak: $name', () {
        final stats = computeWeeklyStats([
          for (final d in days) _ev(daysAgo(d)),
        ], now: now);
        expect(stats.streakDays, expected);
      });
    }

    test('day boundaries follow the local calendar, not 24h windows', () {
      final stats = computeWeeklyStats([
        _ev(daysAgo(1, hour: 23)),
        _ev(daysAgo(0, hour: 0)),
      ], now: now);
      expect(stats.perDay.sublist(5), [1, 1]);
    });
  });

  group('qualifyingBadges', () {
    // Table: description → (events, badge that must be earned, or must not).
    List<NostrEvent> repeat(int n, NostrEvent Function(int i) make) => [
      for (var i = 0; i < n; i++) make(i),
    ];

    final cases = <String, (List<NostrEvent>, HiveBadge, bool)>{
      'first message earns First buzz': (
        [_ev(daysAgo(3))],
        HiveBadge.firstBuzz,
        true,
      ),
      'reactions alone do not earn First buzz': (
        [_ev(daysAgo(3), kind: EventKind.reaction)],
        HiveBadge.firstBuzz,
        false,
      ),
      '49 messages is not Chatterbox': (
        repeat(49, (i) => _ev(daysAgo(i % 30))),
        HiveBadge.chatterbox,
        false,
      ),
      '50 messages is Chatterbox': (
        repeat(50, (i) => _ev(daysAgo(i % 30))),
        HiveBadge.chatterbox,
        true,
      ),
      '10 thread replies is Helpful': (
        repeat(10, (i) => _ev(daysAgo(i), reply: true)),
        HiveBadge.helpful,
        true,
      ),
      '25 reactions is Emoji enthusiast': (
        repeat(25, (i) => _ev(daysAgo(i % 9), kind: EventKind.reaction)),
        HiveBadge.emojiEnthusiast,
        true,
      ),
      '5 channels is Explorer': (
        repeat(5, (i) => _ev(daysAgo(1), channel: 'c$i')),
        HiveBadge.explorer,
        true,
      ),
      '4 channels is not Explorer': (
        repeat(8, (i) => _ev(daysAgo(1), channel: 'c${i % 4}')),
        HiveBadge.explorer,
        false,
      ),
      '5 consecutive days is On a roll': (
        repeat(5, (i) => _ev(daysAgo(20 + i))),
        HiveBadge.onARoll,
        true,
      ),
      '5 days with a gap is not On a roll': (
        [
          for (final d in [20, 21, 22, 24, 25]) _ev(daysAgo(d)),
        ],
        HiveBadge.onARoll,
        false,
      ),
      '3 posts at 6 am is Early bird': (
        repeat(3, (i) => _ev(daysAgo(i, hour: 6))),
        HiveBadge.earlyBird,
        true,
      ),
      '3 posts at 2 am is Night owl': (
        repeat(3, (i) => _ev(daysAgo(i, hour: 2))),
        HiveBadge.nightOwl,
        true,
      ),
      'posts at 8 am are neither': (
        repeat(3, (i) => _ev(daysAgo(i, hour: 8))),
        HiveBadge.earlyBird,
        false,
      ),
    };
    for (final MapEntry(key: name, value: (events, badge, earned))
        in cases.entries) {
      test(name, () {
        expect(qualifyingBadges(events).contains(badge), earned);
      });
    }
  });

  group('HiveBadgeStore', () {
    setUp(() => SharedPreferences.setMockInitialValues({}));

    test('remembers earn times and never re-dates a badge', () async {
      final prefs = await SharedPreferences.getInstance();
      final store = HiveBadgeStore(prefs, relay: 'https://r', pubkey: _me);

      await store.add({HiveBadge.firstBuzz}, at: 100);
      final after = await store.add({
        HiveBadge.firstBuzz,
        HiveBadge.helpful,
      }, at: 200);

      expect(after, {HiveBadge.firstBuzz: 100, HiveBadge.helpful: 200});
      expect(store.read(), after);
    });

    test('is scoped per relay and identity', () async {
      final prefs = await SharedPreferences.getInstance();
      await HiveBadgeStore(
        prefs,
        relay: 'https://r',
        pubkey: _me,
      ).add({HiveBadge.firstBuzz}, at: 1);

      expect(
        HiveBadgeStore(prefs, relay: 'https://other', pubkey: _me).read(),
        isEmpty,
      );
      expect(
        HiveBadgeStore(prefs, relay: 'https://r', pubkey: 'someone').read(),
        isEmpty,
      );
    });

    test('ignores corrupt or unknown stored data', () async {
      SharedPreferences.setMockInitialValues({
        'buzz.hive.badges.v1|https://r|$_me':
            '{"first_buzz": 5, "gone": 1, '
            '"helpful": "x"}',
        'buzz.hive.badges.v1|https://bad|$_me': 'not json',
      });
      final prefs = await SharedPreferences.getInstance();
      expect(HiveBadgeStore(prefs, relay: 'https://r', pubkey: _me).read(), {
        HiveBadge.firstBuzz: 5,
      });
      expect(
        HiveBadgeStore(prefs, relay: 'https://bad', pubkey: _me).read(),
        isEmpty,
      );
    });
  });

  test('hiveFilters asks only for own messages and reactions, bounded', () {
    final filters = hiveFilters(_me, now: now);
    expect(filters, hasLength(2));
    for (final f in filters) {
      expect(f.authors, [_me]);
      expect(f.limit, hiveQueryLimit);
      expect(
        f.since,
        now.subtract(hiveLookback).millisecondsSinceEpoch ~/ 1000,
      );
    }
    expect(filters[0].kinds, EventKind.channelMessageEventKinds);
    expect(filters[1].kinds, [EventKind.reaction]);
  });
}
