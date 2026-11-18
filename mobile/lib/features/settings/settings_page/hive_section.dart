part of '../settings_page.dart';

/// Entry to "Your Hive" — private weekly stats and badges.
class _HiveSection extends StatelessWidget {
  const _HiveSection();

  @override
  Widget build(BuildContext context) {
    return AppListCard(
      verticalPadding: Grid.twelve,
      children: [
        AppListRow(
          key: const ValueKey('hive-entry'),
          icon: BuzzIcons.sparkles,
          title: 'Your Hive',
          subtitle: 'Your week and badges, just for you',
          trailing: const _RowChevron(),
          onTap: () => Navigator.of(
            context,
          ).push(MaterialPageRoute<void>(builder: (_) => const HivePage())),
        ),
      ],
    );
  }
}
