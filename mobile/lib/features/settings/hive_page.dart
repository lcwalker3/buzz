import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:intl/intl.dart';

import '../../shared/emoji/emoji_burst.dart';
import '../../shared/fun/hive_provider.dart';
import '../../shared/fun/hive_stats.dart';
import '../../shared/theme/theme.dart';
import '../../shared/widgets/app_list_card.dart';
import '../../shared/widgets/hive_refresh_indicator.dart';
import '../../shared/widgets/frosted_app_bar.dart';
import '../../shared/widgets/frosted_scaffold.dart';

/// "Your Hive": the signed-in user's own weekly stats and badges.
///
/// Private by construction — computed on the phone from the user's own
/// events and never published or shown to anyone else.
class HivePage extends HookConsumerWidget {
  const HivePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snapshot = ref.watch(hiveSnapshotProvider);
    final stored = ref.watch(storedHiveBadgesProvider);
    final earned = snapshot.value?.earned ?? stored;
    final newlyEarned = snapshot.value?.newlyEarned ?? const <HiveBadge>{};

    // One haptic for the whole batch of new badges, not one per tile.
    useEffect(() {
      if (newlyEarned.isNotEmpty) unawaited(HapticFeedback.mediumImpact());
      return null;
    }, [newlyEarned.length]);

    Future<void> refresh() => ref.refresh(hiveSnapshotProvider.future);

    return FrostedScaffold(
      useUtilitySurfaceTheme: true,
      appBar: const FrostedAppBar(
        nativeTitle: 'Your Hive',
        title: Text('Your Hive'),
      ),
      body: HiveRefreshIndicator(
        onRefresh: () async {
          try {
            await refresh();
          } catch (_) {
            // The error is shown inline below, with a Retry.
          }
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.only(
            top: frostedAppBarHeight(context) + Grid.xxs,
            bottom: MediaQuery.paddingOf(context).bottom + Grid.md,
          ),
          children: [
            switch (snapshot) {
              AsyncData(:final value) => _WeekCard(week: value.week),
              AsyncError(:final error) => _LoadError(
                message: error is StateError ? error.message : '$error',
                onRetry: () => ref.invalidate(hiveSnapshotProvider),
              ),
              _ => const _WeekCardSkeleton(),
            },
            const SizedBox(height: Grid.xs),
            _BadgesCard(earned: earned, newlyEarned: newlyEarned),
            if (snapshot.value?.truncated ?? false)
              const _Footnote(
                'You’ve been busy! Only your most recent activity was '
                'counted, so some badges may unlock later.',
              ),
            const _Footnote(
              'Only you can see this. It’s worked out on your phone from your '
              'own recent activity, and nothing here is shared.',
            ),
          ],
        ),
      ),
    );
  }
}

class _WeekCard extends StatelessWidget {
  final WeeklyStats week;

  const _WeekCard({required this.week});

  @override
  Widget build(BuildContext context) {
    final stats = [
      ('Messages', week.messages),
      ('Reactions', week.reactions),
      ('Thread replies', week.threadReplies),
      ('Active days', week.activeDays),
    ];
    return AppListCard(
      label: 'This week',
      verticalPadding: Grid.xs,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Grid.xs),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  for (final (label, value) in stats)
                    Expanded(
                      child: Semantics(
                        label: '$value $label',
                        excludeSemantics: true,
                        child: Column(
                          children: [
                            Text(
                              label == 'Active days' ? '$value/7' : '$value',
                              style: context.textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: Grid.quarter),
                            Text(
                              label,
                              textAlign: TextAlign.center,
                              style: context.textTheme.labelSmall?.copyWith(
                                color: context.colors.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: Grid.xs),
              _WeekBars(perDay: week.perDay),
              const SizedBox(height: Grid.twelve),
              Text(
                week.isEmpty
                    ? 'A quiet week. Say hi to someone 🍯'
                    : week.streakDays >= 2
                    ? '🔥 ${week.streakDays}-day streak'
                    : 'Nice to see you this week 🍯',
                style: context.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Seven small bars, oldest day first, today highlighted.
class _WeekBars extends StatelessWidget {
  final List<int> perDay;

  const _WeekBars({required this.perDay});

  static const _height = 48.0;

  @override
  Widget build(BuildContext context) {
    final peak = perDay.fold<int>(1, (a, b) => a > b ? a : b);
    final today = DateTime.now();
    final dayFormat = DateFormat.E();
    return Semantics(
      label:
          'Activity over the last 7 days, oldest first: ${perDay.join(', ')}',
      excludeSemantics: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < 7; i++)
            Expanded(
              child: Column(
                children: [
                  Container(
                    height: perDay[i] == 0
                        ? 4
                        : 8 + (_height - 8) * perDay[i] / peak,
                    margin: const EdgeInsets.symmetric(horizontal: Grid.half),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(4),
                      color: i == 6
                          ? context.colors.primary
                          : context.colors.primary.withValues(
                              alpha: perDay[i] == 0 ? 0.15 : 0.45,
                            ),
                    ),
                  ),
                  const SizedBox(height: Grid.half),
                  Text(
                    dayFormat
                        .format(today.subtract(Duration(days: 6 - i)))
                        .substring(0, 1),
                    style: context.textTheme.labelSmall?.copyWith(
                      color: context.colors.onSurfaceVariant,
                      fontWeight: i == 6 ? FontWeight.w700 : null,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _WeekCardSkeleton extends StatelessWidget {
  const _WeekCardSkeleton();

  @override
  Widget build(BuildContext context) {
    return AppListCard(
      label: 'This week',
      verticalPadding: Grid.xs,
      children: [
        Semantics(
          label: 'Loading your week',
          child: const SizedBox(
            height: 140,
            child: Center(child: CircularProgressIndicator.adaptive()),
          ),
        ),
      ],
    );
  }
}

class _LoadError extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _LoadError({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return AppListCard(
      label: 'This week',
      verticalPadding: Grid.xs,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Grid.xs),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Couldn’t load your week',
                style: context.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: Grid.half),
              Text(
                message,
                style: context.textTheme.bodySmall?.copyWith(
                  color: context.colors.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: Grid.twelve),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Retry'),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BadgesCard extends StatelessWidget {
  final EarnedBadges earned;
  final Set<HiveBadge> newlyEarned;

  const _BadgesCard({required this.earned, required this.newlyEarned});

  @override
  Widget build(BuildContext context) {
    final count = HiveBadge.values.where(earned.containsKey).length;
    return AppListCard(
      label: 'Badges · $count of ${HiveBadge.values.length}',
      verticalPadding: Grid.xs,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Grid.xxs),
          child: GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: Grid.xxs,
            crossAxisSpacing: Grid.xxs,
            childAspectRatio: 2.2,
            children: [
              for (final badge in HiveBadge.values)
                _BadgeTile(
                  badge: badge,
                  earnedAt: earned[badge],
                  isNew: newlyEarned.contains(badge),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _BadgeTile extends HookConsumerWidget {
  final HiveBadge badge;
  final int? earnedAt;
  final bool isNew;

  const _BadgeTile({required this.badge, this.earnedAt, this.isNew = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final earned = earnedAt != null;

    // A newly earned badge bursts its emoji once, from its own tile.
    // burstEmojiFromContext already does nothing under Reduce Motion.
    useEffect(() {
      if (!isNew) return null;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) {
          burstEmojiFromContext(
            ref,
            context,
            badge.emoji,
            requirePositive: false,
          );
        }
      });
      return null;
    }, [isNew]);

    final when = earned
        ? DateFormat.yMMMd().format(
            DateTime.fromMillisecondsSinceEpoch(earnedAt! * 1000),
          )
        : null;

    return Semantics(
      label: earned
          ? '${badge.title}, earned $when'
          : '${badge.title}, locked. ${badge.goal}',
      excludeSemantics: true,
      child: Container(
        padding: const EdgeInsets.all(Grid.xxs),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: earned
              ? context.colors.primary.withValues(alpha: 0.10)
              : context.colors.onSurface.withValues(alpha: 0.04),
          border: Border.all(
            color: isNew
                ? context.colors.primary
                : context.colors.outlineVariant.withValues(alpha: 0.5),
            width: isNew ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Opacity(
              opacity: earned ? 1 : 0.3,
              child: Text(badge.emoji, style: const TextStyle(fontSize: 26)),
            ),
            const SizedBox(width: Grid.xxs),
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isNew ? '${badge.title} · New!' : badge.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: earned ? null : context.colors.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    earned ? 'Earned $when' : badge.goal,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: context.textTheme.labelSmall?.copyWith(
                      color: context.colors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Footnote extends StatelessWidget {
  final String text;

  const _Footnote(this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        Grid.gutter + Grid.xs,
        Grid.twelve,
        Grid.gutter + Grid.xs,
        0,
      ),
      child: Text(
        text,
        style: context.textTheme.bodySmall?.copyWith(
          color: context.colors.onSurfaceVariant,
        ),
      ),
    );
  }
}
