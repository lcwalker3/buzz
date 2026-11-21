import 'package:buzz/features/pairing/pairing_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers/widget_helpers.dart';

void main() {
  testWidgets(
    'one quiet bee drifts, holds still when asked, and leaves actions usable',
    (tester) async {
      tester.view.physicalSize = const Size(402, 874);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final reducedMotion = ValueNotifier(false);
      addTearDown(reducedMotion.dispose);
      var communityLinks = 0;
      await tester.pumpWidget(
        WidgetHelpers.testable(
          child: ValueListenableBuilder<bool>(
            valueListenable: reducedMotion,
            builder: (context, reduced, _) => MediaQuery(
              data: MediaQuery.of(context).copyWith(disableAnimations: reduced),
              child: PairingPage(
                connectionLanding: true,
                onCommunityLink: () => communityLinks++,
              ),
            ),
          ),
        ),
      );
      final bee = find.byKey(const ValueKey('welcome-bee'));
      expect(bee, findsOneWidget);
      expect(find.byKey(const Key('welcome-honeycomb')), findsOneWidget);
      Offset beePosition() => tester.getTopLeft(bee);

      final start = beePosition();
      await tester.pump(const Duration(milliseconds: 500));
      expect(beePosition(), isNot(start));
      // The bee stays in the upper part of the screen, away from the actions.
      expect(beePosition().dy, lessThan(874 * 0.4));

      await tester.tap(find.text('Enter a community link').hitTestable());
      expect(communityLinks, 1);

      reducedMotion.value = true;
      await tester.pump();
      final still = beePosition();
      await tester.pump(const Duration(seconds: 1));
      expect(beePosition(), still);
      expect(find.bySemanticsLabel('The Hive'), findsOneWidget);

      reducedMotion.value = false;
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(beePosition(), isNot(still));

      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      final paused = beePosition();
      await tester.pump(const Duration(seconds: 1));
      expect(beePosition(), paused);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      expect(beePosition(), isNot(paused));
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
    },
  );
}
