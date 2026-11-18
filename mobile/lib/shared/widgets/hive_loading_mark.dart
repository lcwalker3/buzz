import 'package:flutter/material.dart';
import 'package:flutter_hooks/flutter_hooks.dart';

import '../theme/theme_extensions.dart';
import 'honeycomb_mark.dart';

/// The Hive's loading mark: the honeycomb's centre cell fills with honey and
/// empties again while the side cells pulse. With reduced motion it holds
/// still, full.
class HiveLoadingMark extends HookWidget {
  const HiveLoadingMark({super.key});

  static const _ease = Cubic(.16, 1, .3, 1);

  @override
  Widget build(BuildContext context) {
    final reduced = MediaQuery.disableAnimationsOf(context);
    final controller = useAnimationController(
      duration: const Duration(milliseconds: 880),
    );
    useEffect(() {
      if (reduced) {
        controller
          ..stop()
          ..value = 1;
      } else {
        controller.repeat(reverse: true);
      }
      return controller.stop;
    }, [controller, reduced]);
    final progress = _ease.transform(useAnimation(controller));
    return Semantics(
      label: 'Loading',
      liveRegion: true,
      child: ExcludeSemantics(
        child: HoneycombMark(
          width: 80,
          color: context.colors.onSurface,
          pulseAmount: reduced ? 0 : 0.5 * progress,
          honeyProgress: progress,
        ),
      ),
    );
  }
}
