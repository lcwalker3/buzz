import 'dart:math' show cos, min, pi, sin;

import 'package:flutter/material.dart';

/// The Hive's honeycomb mark at a caller-controlled pulse.
///
/// Three hexagonal cells in a row: a large centre cell between two smaller
/// ones.
/// Callers drive the pulse themselves, which lets one painter serve both the
/// loading marks ([HiveLoadingMark], the huddle loader) and the
/// pull-to-refresh indicator ([HiveRefreshIndicator]).
class HoneycombMark extends StatelessWidget {
  /// The rendered width of the complete mark.
  ///
  /// Height follows from the mark's 466:309 aspect ratio.
  final double width;

  /// The color used for the cell walls and the honey fill.
  final Color color;

  /// How far the side cells are drawn in toward the centre, from 0 to 1.
  ///
  /// 0 renders the row fully spread; 1 renders the side cells tucked in and
  /// slightly smaller. Callers animate this to make the mark pulse.
  final double pulseAmount;

  /// How full the centre cell is with honey, from 0 to 1, or null for an
  /// empty cell.
  final double? honeyProgress;

  const HoneycombMark({
    required this.width,
    required this.color,
    required this.pulseAmount,
    this.honeyProgress,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: CustomPaint(
        size: Size(width, width * 309 / 466),
        painter: _HoneycombMarkPainter(
          color: color,
          pulseAmount: pulseAmount,
          honeyProgress: honeyProgress,
        ),
      ),
    );
  }
}

/// A pointy-top hexagon centred on [center] with circumradius [radius].
Path _hexagon(Offset center, double radius) {
  final path = Path();
  for (var i = 0; i < 6; i++) {
    final angle = (pi / 3) * i - pi / 2;
    final point = center + Offset(cos(angle), sin(angle)) * radius;
    if (i == 0) {
      path.moveTo(point.dx, point.dy);
    } else {
      path.lineTo(point.dx, point.dy);
    }
  }
  return path..close();
}

class _HoneycombMarkPainter extends CustomPainter {
  final Color color;
  final double pulseAmount;
  final double? honeyProgress;

  const _HoneycombMarkPainter({
    required this.color,
    required this.pulseAmount,
    this.honeyProgress,
  });

  static const _center = Offset(233, 154.5);
  static const _centerRadius = 110.0;
  static const _sideRadius = 75.0;
  static const _sideOffset = 168.0;

  /// Inner (empty) part of a cell, as a fraction of its outer radius.
  static const _cellFraction = 0.62;

  @override
  void paint(Canvas canvas, Size size) {
    final scale = min(size.width / 466, size.height / 309);
    final renderedWidth = 466 * scale;
    final renderedHeight = 309 * scale;

    canvas
      ..save()
      ..translate(
        (size.width - renderedWidth) / 2,
        (size.height - renderedHeight) / 2,
      )
      ..scale(scale);

    final pulse = pulseAmount.clamp(0.0, 1.0);
    final sideRadius = _sideRadius * (1 - (0.2 * pulse));
    final sideOffset = _sideOffset - (20 * pulse);
    final left = _center - Offset(sideOffset, 0);
    final right = _center + Offset(sideOffset, 0);

    Path ring(Offset center, double radius) => Path.combine(
      PathOperation.difference,
      _hexagon(center, radius),
      _hexagon(center, radius * _cellFraction),
    );

    final paint = Paint()..color = color;
    canvas
      ..drawPath(ring(left, sideRadius), paint)
      ..drawPath(ring(right, sideRadius), paint)
      ..drawPath(ring(_center, _centerRadius), paint);

    if (honeyProgress case final progress?) {
      // A full fill reaches the cell wall so no gap shows behind the emoji.
      // The extra point overlaps the wall so no hairline seam shows.
      final radius =
          (_centerRadius * _cellFraction + 1) * progress.clamp(0.0, 1.0);
      if (radius > 0) canvas.drawPath(_hexagon(_center, radius), paint);
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(_HoneycombMarkPainter oldDelegate) =>
      color != oldDelegate.color ||
      pulseAmount != oldDelegate.pulseAmount ||
      honeyProgress != oldDelegate.honeyProgress;
}
