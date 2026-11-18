/// Private, on-device activity stats and badges ("Your Hive").
///
/// Everything here is a pure function of the signed-in user's own events, so
/// it is deterministic and testable without a relay. Nothing is published:
/// stats and badges are only ever shown to the user who earned them.
library;

import 'package:flutter/foundation.dart';

import '../relay/nostr_models.dart';
import '../relay/thread_reference.dart';

/// How far back the stats query looks. Badges are judged on this window;
/// once earned they are remembered (see `hive_badge_store.dart`).
const hiveLookback = Duration(days: 90);

/// Upper bound on events fetched per kind group, keeping the query bounded.
const hiveQueryLimit = 500;

@immutable
class WeeklyStats {
  /// Messages (channel, forum and thread) sent in the last 7 days.
  final int messages;

  /// Emoji reactions given in the last 7 days.
  final int reactions;

  /// Of [messages], how many were replies in a thread.
  final int threadReplies;

  /// Days out of the last 7 with at least one message or reaction.
  final int activeDays;

  /// Activity per day, oldest first; the last entry is today.
  final List<int> perDay;

  /// Consecutive active days ending today (or yesterday, if today has no
  /// activity yet — a streak isn't broken until the day is over).
  final int streakDays;

  const WeeklyStats({
    required this.messages,
    required this.reactions,
    required this.threadReplies,
    required this.activeDays,
    required this.perDay,
    required this.streakDays,
  });

  bool get isEmpty => messages == 0 && reactions == 0;
}

bool _isMessage(NostrEvent e) =>
    EventKind.channelMessageEventKinds.contains(e.kind);

bool _isThreadReply(NostrEvent e) =>
    e.kind == EventKind.forumComment ||
    (_isMessage(e) && parseThreadReference(e.tags).parentId != null);

DateTime _localDay(int createdAt) {
  final t = DateTime.fromMillisecondsSinceEpoch(createdAt * 1000);
  return DateTime(t.year, t.month, t.day);
}

/// Whole calendar days from [day] to [today]. Compared as UTC dates so a
/// 23- or 25-hour daylight-saving day still counts as exactly one.
int _dayIndex(DateTime day, DateTime today) => DateTime.utc(
  today.year,
  today.month,
  today.day,
).difference(DateTime.utc(day.year, day.month, day.day)).inDays;

/// Weekly stats for [events] (the user's own), as of [now] in local time.
WeeklyStats computeWeeklyStats(
  List<NostrEvent> events, {
  required DateTime now,
}) {
  final today = DateTime(now.year, now.month, now.day);
  final perDay = List<int>.filled(7, 0);
  var messages = 0;
  var reactions = 0;
  var threadReplies = 0;
  final activeDayKeys = <DateTime>{};

  for (final e in events) {
    final isMessage = _isMessage(e);
    final isReaction = e.kind == EventKind.reaction;
    if (!isMessage && !isReaction) continue;
    final day = _localDay(e.createdAt);
    activeDayKeys.add(day);
    final ago = _dayIndex(day, today);
    if (ago < 0 || ago > 6) continue;
    perDay[6 - ago] += 1;
    if (isMessage) {
      messages += 1;
      if (_isThreadReply(e)) threadReplies += 1;
    } else {
      reactions += 1;
    }
  }

  var streak = 0;
  var cursor = activeDayKeys.contains(today)
      ? today
      : today.subtract(const Duration(days: 1));
  while (activeDayKeys.contains(cursor)) {
    streak += 1;
    cursor = DateTime(cursor.year, cursor.month, cursor.day - 1);
  }

  return WeeklyStats(
    messages: messages,
    reactions: reactions,
    threadReplies: threadReplies,
    activeDays: perDay.where((n) => n > 0).length,
    perDay: perDay,
    streakDays: streak,
  );
}

/// Badges a user can earn. Ids are persisted, so never rename one.
enum HiveBadge {
  firstMessage('first_buzz', '💬', 'First message', 'Send your first message'),
  chatterbox('chatterbox', '💬', 'Chatterbox', 'Send 50 messages'),
  helpful('helpful', '🤝', 'Helpful', 'Reply in 10 threads'),
  emojiEnthusiast(
    'emoji_enthusiast',
    '🎉',
    'Emoji enthusiast',
    'Give 25 reactions',
  ),
  explorer('explorer', '🧭', 'Explorer', 'Post in 5 different channels'),
  onARoll('on_a_roll', '🔥', 'On a roll', 'Be active 5 days in a row'),
  earlyBird('early_bird', '🌅', 'Early bird', 'Post 3 times before 8 am'),
  nightOwl('night_owl', '🦉', 'Night owl', 'Post 3 times after midnight');

  final String id;
  final String emoji;
  final String title;
  final String goal;

  const HiveBadge(this.id, this.emoji, this.title, this.goal);

  static HiveBadge? byId(String id) {
    for (final badge in values) {
      if (badge.id == id) return badge;
    }
    return null;
  }
}

/// Longest run of consecutive active days in [days].
int _longestRun(Set<DateTime> days) {
  var best = 0;
  for (final day in days) {
    final prev = DateTime(day.year, day.month, day.day - 1);
    if (days.contains(prev)) continue; // not the start of a run
    var run = 1;
    var next = DateTime(day.year, day.month, day.day + 1);
    while (days.contains(next)) {
      run += 1;
      next = DateTime(next.year, next.month, next.day + 1);
    }
    if (run > best) best = run;
  }
  return best;
}

/// Badges [events] (the user's own) qualify for.
Set<HiveBadge> qualifyingBadges(List<NostrEvent> events) {
  var messages = 0;
  var reactions = 0;
  var replies = 0;
  var early = 0;
  var late = 0;
  final channels = <String>{};
  final activeDays = <DateTime>{};

  for (final e in events) {
    final isMessage = _isMessage(e);
    if (isMessage) {
      messages += 1;
      if (_isThreadReply(e)) replies += 1;
      final channel = e.getTagValue('h');
      if (channel != null && channel.isNotEmpty) channels.add(channel);
      final hour = DateTime.fromMillisecondsSinceEpoch(e.createdAt * 1000).hour;
      if (hour >= 5 && hour < 8) early += 1;
      if (hour < 5) late += 1;
    } else if (e.kind == EventKind.reaction) {
      reactions += 1;
    } else {
      continue;
    }
    activeDays.add(_localDay(e.createdAt));
  }

  return {
    if (messages >= 1) HiveBadge.firstMessage,
    if (messages >= 50) HiveBadge.chatterbox,
    if (replies >= 10) HiveBadge.helpful,
    if (reactions >= 25) HiveBadge.emojiEnthusiast,
    if (channels.length >= 5) HiveBadge.explorer,
    if (_longestRun(activeDays) >= 5) HiveBadge.onARoll,
    if (early >= 3) HiveBadge.earlyBird,
    if (late >= 3) HiveBadge.nightOwl,
  };
}
