import 'package:buzz/features/settings/hive_page.dart';
import 'package:buzz/shared/fun/hive_provider.dart';
import 'package:buzz/shared/fun/hive_stats.dart';
import 'package:buzz/shared/relay/nostr_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../helpers/widget_helpers.dart';

const _me = 'f00d';
final _parent = 'e' * 64;

NostrEvent _reply(int i) {
  final t = DateTime.now().subtract(Duration(hours: i));
  return NostrEvent(
    id: 'r$i',
    pubkey: _me,
    createdAt: t.millisecondsSinceEpoch ~/ 1000,
    kind: EventKind.streamMessageV2,
    tags: [
      ['h', 'general'],
      ['e', _parent, '', 'reply'],
    ],
    content: 'reply $i',
    sig: 'sig',
  );
}

void main() {
  testWidgets('Your Hive: offline badges, retry, new badge, then remembered', (
    tester,
  ) async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final store = HiveBadgeStore(prefs, relay: 'https://r', pubkey: _me);
    await store.add({HiveBadge.firstBuzz}, at: 1700000000);

    var online = false;
    var queries = 0;
    Future<List<NostrEvent>> fakeRelay(List<NostrFilter> filters) async {
      queries += 1;
      if (!online) throw StateError('Relay unreachable');
      // A relay that ignores `authors` must not inflate the user's stats.
      return [
        for (var i = 0; i < 10; i++) _reply(i),
        _reply(99).copyWithPubkey('someone-else'),
      ];
    }

    Widget app() => WidgetHelpers.testable(
      disableAnimations: true,
      overrides: [
        hivePubkeyProvider.overrideWithValue(_me),
        hiveBadgeStoreProvider.overrideWithValue(store),
        hiveQueryProvider.overrideWithValue(fakeRelay),
      ],
      child: const HivePage(),
    );

    // 1. Offline: the week can't load, but earned badges still show.
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    expect(find.text('Couldn’t load your week'), findsOneWidget);
    expect(find.text('Relay unreachable'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r'^First buzz, earned')), findsOne);
    expect(
      find.bySemanticsLabel('Helpful, locked. Reply in 10 threads'),
      findsOne,
    );

    // 2. Retry once the relay is back: stats load and Helpful is new.
    online = true;
    await tester.tap(find.text('Retry'));
    await tester.pumpAndSettle();
    expect(queries, 2);
    expect(find.bySemanticsLabel(RegExp(r'\b10 Messages\b')), findsOne);
    expect(find.bySemanticsLabel(RegExp(r'\b10 Thread replies\b')), findsOne);
    expect(find.text('Helpful · New!'), findsOneWidget);
    expect(store.read().keys, containsAll([HiveBadge.helpful]));
    expect(store.read()[HiveBadge.firstBuzz], 1700000000);

    // 3. Coming back later: still earned, no longer "new".
    await tester.pumpWidget(const SizedBox());
    await tester.pumpWidget(app());
    await tester.pumpAndSettle();
    expect(find.text('Helpful · New!'), findsNothing);
    expect(find.bySemanticsLabel(RegExp(r'^Helpful, earned')), findsOne);
    // The privacy promise is on the page (below the fold on small screens).
    await tester.scrollUntilVisible(
      find.textContaining('Only you can see this'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.textContaining('Only you can see this'), findsOneWidget);
  });
}

extension on NostrEvent {
  NostrEvent copyWithPubkey(String pubkey) => NostrEvent(
    id: id,
    pubkey: pubkey,
    createdAt: createdAt,
    kind: kind,
    tags: tags,
    content: content,
    sig: sig,
  );
}
