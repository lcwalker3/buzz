import 'package:buzz/shared/fun/caught_up_celebration.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import '../../helpers/widget_helpers.dart';

void main() {
  late List<String> haptics;

  setUp(() {
    haptics = [];
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, (call) async {
          if (call.method == 'HapticFeedback.vibrate') {
            haptics.add('${call.arguments}');
          }
          return null;
        });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(SystemChannels.platform, null);
  });

  // Table: (celebrate, reduce motion) → haptic plays, headline announced.
  final cases = <String, (bool, bool, bool)>{
    'just caught up, motion on': (true, false, true),
    'just caught up, Reduce Motion': (true, true, true),
    'already empty when opened': (false, false, false),
  };

  for (final MapEntry(key: name, value: (celebrate, reduceMotion, cheers))
      in cases.entries) {
    testWidgets(name, (tester) async {
      await tester.pumpWidget(
        WidgetHelpers.testable(
          disableAnimations: reduceMotion,
          child: CaughtUpCelebration(celebrate: celebrate),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('All caught up!'), findsOneWidget);
      expect(haptics, cheers ? ['HapticFeedbackType.lightImpact'] : isEmpty);
      final headline = tester.getSemantics(find.text('All caught up!'));
      expect(
        headline.flagsCollection.isLiveRegion,
        cheers,
        reason: 'only the moment of catching up is announced',
      );
      // The bee is decoration; screen readers hear the words, not "bee".
      expect(find.bySemanticsLabel('🍯'), findsNothing);
    });
  }
}
