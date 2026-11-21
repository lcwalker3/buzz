/// "All caught up" — a small reward for clearing the last unread item.
library;

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_hooks/flutter_hooks.dart';

import '../theme/theme.dart';

/// Friendly empty state for an inbox with nothing unread.
///
/// With [celebrate] (the user *just* cleared their last unread item) the honey
/// flies in with a little wobble and a light haptic plays, once. With Reduce
/// Motion on, or when not celebrating, the honey simply fades in. The headline is
/// a live region so screen readers announce the moment too.
class CaughtUpCelebration extends HookWidget {
  final bool celebrate;
  final String? detail;

  const CaughtUpCelebration({super.key, this.celebrate = false, this.detail});

  static const _flyIn = Duration(milliseconds: 900);

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final animate = celebrate && !reduceMotion;
    final controller = useAnimationController(
      duration: animate ? _flyIn : const Duration(milliseconds: 250),
    );

    useEffect(() {
      unawaited(controller.forward());
      if (celebrate) unawaited(HapticFeedback.lightImpact());
      return null;
    }, const []);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: Grid.gutter),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AnimatedBuilder(
              animation: controller,
              builder: (context, child) {
                final t = controller.value;
                if (!animate) return Opacity(opacity: t, child: child);
                final fly = Curves.easeOutBack.transform(t);
                final wobble = math.sin(t * math.pi * 4) * (1 - t) * 0.35;
                return Opacity(
                  opacity: Curves.easeOut.transform(t),
                  child: Transform.translate(
                    offset: Offset((1 - fly) * -80, (1 - fly) * 40),
                    child: Transform.rotate(
                      angle: wobble,
                      child: Transform.scale(
                        scale: 0.6 + 0.4 * fly,
                        child: child,
                      ),
                    ),
                  ),
                );
              },
              child: const ExcludeSemantics(
                child: Text('🍯', style: TextStyle(fontSize: 48)),
              ),
            ),
            const SizedBox(height: Grid.xs),
            Semantics(
              liveRegion: celebrate,
              child: Text(
                'All caught up!',
                style: context.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: Grid.half),
            Text(
              detail ?? 'Nothing unread. Nice work.',
              style: context.textTheme.bodySmall?.copyWith(
                color: context.colors.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
