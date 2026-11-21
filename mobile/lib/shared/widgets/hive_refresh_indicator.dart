import 'dart:async' show Timer, unawaited;
import 'dart:math' show cos, min, pi, sin;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../theme/theme.dart';
import 'honeycomb_mark.dart';

/// Replaces the standard pull-to-refresh spinner with The Hive's honeycomb mark.
///
/// Flutter continues to own the gesture, refresh lifecycle, and accessibility
/// semantics. This widget maps those states into the elastic pull, retained
/// loading gap, and mark animation.
class HiveRefreshIndicator extends HookConsumerWidget {
  /// Called when the user completes a pull, to load fresh data.
  ///
  /// The mark keeps pulsing until this future settles, so it should complete
  /// only once the refresh is done.
  final Future<void> Function() onRefresh;

  /// The scrollable this indicator wraps.
  ///
  /// It must scroll vertically; the indicator reads its scroll notifications
  /// to couple the mark to the user's finger.
  final Widget child;

  /// The vertical offset of the scrollable's top edge, such as a pinned header.
  final double edgeOffset;

  const HiveRefreshIndicator({
    required this.onRefresh,
    required this.child,
    this.edgeOffset = 0,
    super.key,
  });

  static const _markWidth = 60.0;
  static const _markHeight = _markWidth * 309 / 466;
  static const _triggerDistance = 100.0;
  static const _loadingGap = 72.0;
  static const _markVerticalAlignment = 0.75;
  static const _markInitialScale = 0.6;
  static const _markRevealStartProgress = 0.18;
  static const _fillStartBeyondArmDistance = 96.0;
  static const _fillFullBeforeEmojiDistance = 8.0;
  static const _honeyEmojiSwapViewportFraction = 0.26;
  static const _honeyEmojiMinSwapBeyondArmDistance = 220.0;
  static const _honeyEmojiMaxSwapBeyondArmDistance = 280.0;
  static const _fillMinBeyondArmDuration = Duration(milliseconds: 300);
  static const _honeyEmojiMinBeyondArmDuration = Duration(milliseconds: 700);
  static const _honeyShakePeriod = Duration(milliseconds: 140);
  static const _settleDuration = Duration(milliseconds: 180);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = useState<RefreshIndicatorStatus?>(null);
    final pullProgress = useState(0.0);
    final pullDistance = useState(0.0);
    final pullBeyondArmDistance = useState(0.0);
    final pullBeyondArmDuration = useState(Duration.zero);
    final activePointers = useRef(<int>{});
    final lastPointerTime = useRef(Duration.zero);
    final armedAt = useRef<Duration?>(null);
    final didTriggerArmHaptic = useRef(false);
    final didTriggerEmojiHaptic = useRef(false);
    final honeyShakeHapticTimer = useRef<Timer?>(null);
    final completionController = useAnimationController(
      duration: _settleDuration,
    );
    final gapController = useAnimationController(
      duration: _settleDuration,
      reverseDuration: _settleDuration,
    );
    final pulseController = useAnimationController(
      duration: const Duration(milliseconds: 480),
    );
    final honeyShakeController = useAnimationController(
      duration: _honeyShakePeriod,
    );
    final completionProgress = useAnimation(completionController);
    final gapProgress = useAnimation(gapController);
    final pulseProgress = useAnimation(pulseController);
    final honeyShakeProgress = useAnimation(honeyShakeController);
    final reducedMotion = MediaQuery.disableAnimationsOf(context);
    useEffect(
      () =>
          () => honeyShakeHapticTimer.value?.cancel(),
      const [],
    );
    final honeyEmojiSwapDistance =
        (MediaQuery.sizeOf(context).height * _honeyEmojiSwapViewportFraction)
            .clamp(
              _honeyEmojiMinSwapBeyondArmDistance,
              _honeyEmojiMaxSwapBeyondArmDistance,
            )
            .toDouble();

    void stopHoneyShake() {
      honeyShakeController
        ..stop()
        ..reset();
      honeyShakeHapticTimer.value?.cancel();
      honeyShakeHapticTimer.value = null;
    }

    void startHoneyShake() {
      stopHoneyShake();
      if (reducedMotion) return;

      honeyShakeController.repeat();
      honeyShakeHapticTimer.value = Timer.periodic(
        _honeyShakePeriod,
        (_) => unawaited(HapticFeedback.selectionClick()),
      );
    }

    void beginExpressionTracking() {
      if (activePointers.value.isEmpty || armedAt.value != null) return;
      pullBeyondArmDistance.value = 0;
      pullBeyondArmDuration.value = Duration.zero;
      armedAt.value = lastPointerTime.value;
      if (!didTriggerArmHaptic.value) {
        didTriggerArmHaptic.value = true;
        unawaited(HapticFeedback.mediumImpact());
      }
    }

    void updateStatus(RefreshIndicatorStatus? nextStatus) {
      status.value = nextStatus;

      if (nextStatus == RefreshIndicatorStatus.drag) {
        completionController.reset();
        gapController.reset();
        pulseController.stop();
        if (!didTriggerArmHaptic.value) {
          pullBeyondArmDistance.value = 0;
          pullBeyondArmDuration.value = Duration.zero;
          armedAt.value = null;
        }
      } else if (nextStatus == RefreshIndicatorStatus.armed) {
        pullProgress.value = 1;
        beginExpressionTracking();
      } else if (nextStatus == RefreshIndicatorStatus.snap ||
          nextStatus == RefreshIndicatorStatus.refresh) {
        stopHoneyShake();
        pullProgress.value = 1;
        pullBeyondArmDistance.value = 0;
        pullBeyondArmDuration.value = Duration.zero;
        armedAt.value = null;
        if (reducedMotion) {
          gapController.value = 1;
        } else {
          gapController.animateTo(1, curve: Curves.easeOutCubic);
        }
        if (!reducedMotion) pulseController.repeat();
      } else if (nextStatus == RefreshIndicatorStatus.done) {
        stopHoneyShake();
        if (reducedMotion) {
          gapController.value = 0;
          pullProgress.value = 0;
          pullDistance.value = 0;
          pullBeyondArmDistance.value = 0;
          pullBeyondArmDuration.value = Duration.zero;
          status.value = null;
        } else {
          pulseController.repeat();
          gapController
              .animateTo(1, curve: Curves.easeOutCubic)
              .whenCompleteOrCancel(() {
                if (!gapController.isCompleted || status.value == null) return;
                gapController.animateBack(0, curve: Curves.easeInOutCubic);
                completionController.forward(from: 0).whenCompleteOrCancel(() {
                  if (!completionController.isCompleted) return;
                  pulseController.stop();
                  pullProgress.value = 0;
                  pullDistance.value = 0;
                  pullBeyondArmDistance.value = 0;
                  pullBeyondArmDuration.value = Duration.zero;
                  status.value = null;
                });
              });
        }
      } else if (nextStatus == RefreshIndicatorStatus.canceled ||
          nextStatus == null) {
        stopHoneyShake();
        pullProgress.value = 0;
        pullDistance.value = 0;
        pullBeyondArmDistance.value = 0;
        pullBeyondArmDuration.value = Duration.zero;
        armedAt.value = null;
        if (!gapController.isAnimating) gapController.reset();
        pulseController.stop();
      }
    }

    bool trackPull(ScrollNotification notification) {
      if (notification.metrics.axis != Axis.vertical) return false;

      if (notification is! ScrollStartNotification &&
          notification.metrics.extentBefore == 0) {
        // BouncingScrollPhysics reports a live negative scroll position while
        // the user is pulling. Reading it keeps the mark coupled to the finger.
        final elasticPull =
            (notification.metrics.minScrollExtent - notification.metrics.pixels)
                .clamp(0.0, double.infinity)
                .toDouble();
        if (elasticPull > 0 || pullDistance.value > 0) {
          pullDistance.value = elasticPull;
          final nextProgress = (elasticPull / _triggerDistance).clamp(0.0, 1.0);
          pullProgress.value = nextProgress;
          if (nextProgress >= 1) beginExpressionTracking();
        } else if (notification case OverscrollNotification()) {
          // Clamping physics does not expose a negative position, so build the
          // same progress from its overscroll deltas.
          final nextDistance =
              pullDistance.value + notification.overscroll.abs();
          pullDistance.value = nextDistance;
          pullProgress.value = (nextDistance / _triggerDistance).clamp(
            0.0,
            1.0,
          );
          if (pullProgress.value >= 1) beginExpressionTracking();
        }
      }
      return false;
    }

    void startPointer(PointerDownEvent event) {
      final isNewGesture = activePointers.value.isEmpty;
      activePointers.value.add(event.pointer);
      if (!isNewGesture) return;

      lastPointerTime.value = event.timeStamp;
      armedAt.value = null;
      didTriggerArmHaptic.value = false;
      didTriggerEmojiHaptic.value = false;
      stopHoneyShake();
      pullProgress.value = 0;
      pullDistance.value = 0;
      pullBeyondArmDistance.value = 0;
      pullBeyondArmDuration.value = Duration.zero;
    }

    void trackPointer(PointerMoveEvent event) {
      if (!activePointers.value.contains(event.pointer)) return;
      lastPointerTime.value = event.timeStamp;
      if (armedAt.value == null) return;

      pullBeyondArmDistance.value =
          (pullBeyondArmDistance.value + event.delta.dy)
              .clamp(0.0, double.infinity)
              .toDouble();
      if (armedAt.value case final armedTime?) {
        pullBeyondArmDuration.value = event.timeStamp - armedTime;
      }
      if (!didTriggerEmojiHaptic.value &&
          pullBeyondArmDuration.value >= _honeyEmojiMinBeyondArmDuration &&
          pullBeyondArmDistance.value >= honeyEmojiSwapDistance) {
        didTriggerEmojiHaptic.value = true;
        unawaited(HapticFeedback.heavyImpact());
        startHoneyShake();
      }
    }

    void finishPointer(PointerEvent event) {
      if (!activePointers.value.remove(event.pointer)) return;
      if (activePointers.value.isNotEmpty) return;

      stopHoneyShake();
      armedAt.value = null;
      pullBeyondArmDistance.value = 0;
      pullBeyondArmDuration.value = Duration.zero;
    }

    final isLoading = switch (status.value) {
      RefreshIndicatorStatus.snap ||
      RefreshIndicatorStatus.refresh ||
      RefreshIndicatorStatus.done => true,
      _ => false,
    };
    final dragRevealProgress =
        ((pullProgress.value - _markRevealStartProgress) /
                (1 - _markRevealStartProgress))
            .clamp(0.0, 1.0);
    final isVisible =
        status.value != null &&
        (isLoading || dragRevealProgress > 0 || completionProgress > 0);
    final retainedGap = _loadingGap * gapProgress;
    final visibleGap = pullDistance.value + retainedGap;
    final top =
        edgeOffset + (visibleGap - _markHeight) * _markVerticalAlignment;
    final opacity = isLoading ? 1 - completionProgress : dragRevealProgress;
    final markScale = isLoading
        ? 1.0
        : _markInitialScale + (1 - _markInitialScale) * dragRevealProgress;
    final pulseAmount = reducedMotion
        ? 0.0
        : isLoading
        ? 0.5 - (0.5 * cos(pulseProgress * 4 * pi))
        : pullProgress.value * 0.18;
    final fillFullDistance =
        honeyEmojiSwapDistance - _fillFullBeforeEmojiDistance;
    final fillDistanceProgress =
        ((pullBeyondArmDistance.value - _fillStartBeyondArmDistance) /
                (fillFullDistance - _fillStartBeyondArmDistance))
            .clamp(0.0, 1.0);
    final fillGrowthDuration =
        _honeyEmojiMinBeyondArmDuration - _fillMinBeyondArmDuration;
    final fillProgress =
        pullBeyondArmDuration.value >= _fillMinBeyondArmDuration
        ? min(
            fillDistanceProgress,
            ((pullBeyondArmDuration.value - _fillMinBeyondArmDuration)
                        .inMicroseconds /
                    fillGrowthDuration.inMicroseconds)
                .clamp(0.0, 1.0),
          ).toDouble()
        : 0.0;
    final showHoneyEmoji = !isLoading && didTriggerEmojiHaptic.value;
    final honeyShakeOffset = showHoneyEmoji && !reducedMotion
        ? sin(honeyShakeProgress * 2 * pi) * 0.75
        : 0.0;
    final scrollBehavior = ScrollConfiguration.of(context).copyWith(
      overscroll: false,
      physics: const BouncingScrollPhysics(
        parent: AlwaysScrollableScrollPhysics(),
      ),
    );

    return Stack(
      clipBehavior: Clip.none,
      children: [
        RefreshIndicator.noSpinner(
          onRefresh: onRefresh,
          onStatusChange: updateStatus,
          semanticsLabel: 'Pull to refresh',
          child: NotificationListener<ScrollNotification>(
            onNotification: trackPull,
            child: Listener(
              behavior: HitTestBehavior.translucent,
              onPointerDown: startPointer,
              onPointerMove: trackPointer,
              onPointerUp: finishPointer,
              onPointerCancel: finishPointer,
              child: ScrollConfiguration(
                behavior: scrollBehavior,
                child: Transform.translate(
                  key: const ValueKey('hive-refresh-retained-gap'),
                  offset: Offset(0, retainedGap),
                  child: child,
                ),
              ),
            ),
          ),
        ),
        if (isVisible)
          Positioned(
            top: edgeOffset,
            left: 0,
            right: 0,
            bottom: 0,
            child: ClipRect(
              child: Align(
                alignment: Alignment.topCenter,
                child: Transform.translate(
                  offset: Offset(0, top - edgeOffset),
                  child: IgnorePointer(
                    child: Opacity(
                      key: const ValueKey('hive-refresh-opacity'),
                      opacity: opacity.clamp(0.0, 1.0),
                      child: Transform.scale(
                        key: const ValueKey('hive-refresh-scale'),
                        scale: markScale,
                        child: SizedBox(
                          width: _markWidth,
                          height: _markHeight,
                          child: Stack(
                            clipBehavior: Clip.none,
                            alignment: Alignment.topCenter,
                            children: [
                              Positioned.fill(
                                child: HoneycombMark(
                                  width: _markWidth,
                                  color: context.colors.primary,
                                  pulseAmount: pulseAmount,
                                  honeyProgress: showHoneyEmoji
                                      ? 1
                                      : !isLoading && fillProgress > 0
                                      ? fillProgress
                                      : null,
                                ),
                              ),
                              if (showHoneyEmoji)
                                Positioned(
                                  top: 11,
                                  left: 0,
                                  right: 0,
                                  child: ExcludeSemantics(
                                    child: Transform.translate(
                                      key: const ValueKey(
                                        'hive-refresh-honey-emoji-offset',
                                      ),
                                      offset: Offset.zero,
                                      child: Transform.translate(
                                        key: const ValueKey(
                                          'hive-refresh-honey-emoji-shake',
                                        ),
                                        offset: Offset(honeyShakeOffset, 0),
                                        child: const Text(
                                          '🍯',
                                          key: ValueKey(
                                            'hive-refresh-honey-emoji',
                                          ),
                                          textAlign: TextAlign.center,
                                          style: TextStyle(
                                            fontSize: 18,
                                            height: 1,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
