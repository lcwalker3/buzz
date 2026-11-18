part of '../pairing_page.dart';

/// One small bee drifting slowly in the upper part of the welcome screen.
///
/// It loops along a gentle figure-eight and holds still when animations are
/// reduced, when its ticker is muted, or while the app is not in front.
class _WelcomeBee extends HookWidget {
  const _WelcomeBee();

  static const _size = Size(44, 34);
  static const _loop = Duration(seconds: 9);

  @override
  Widget build(BuildContext context) {
    final controller = useAnimationController(duration: _loop);
    final lifecycle = useAppLifecycleState();
    final playing =
        !MediaQuery.disableAnimationsOf(context) &&
        TickerMode.valuesOf(context).enabled &&
        (lifecycle == null || lifecycle == AppLifecycleState.resumed);
    useEffect(() {
      if (playing) {
        controller.repeat();
      } else {
        controller.stop();
      }
      return null;
    }, [controller, playing]);
    final t = useAnimation(controller) * 2 * math.pi;

    return LayoutBuilder(
      builder: (context, constraints) {
        final area = constraints.biggest;
        // Figure-eight around a point to the upper right of centre.
        final anchor = Offset(area.width * 0.68, area.height * 0.2);
        final offset = Offset(math.sin(t) * 18, math.sin(2 * t) * 6);
        final position = anchor + offset - _size.center(Offset.zero);
        // Lean slightly into the direction of travel.
        final tilt = math.cos(t) * 0.12;
        return Stack(
          children: [
            Positioned(
              left: position.dx,
              top: position.dy,
              child: Transform.rotate(
                key: const ValueKey('welcome-bee'),
                angle: tilt,
                child: const CustomPaint(size: _size, painter: _BeePainter()),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// A simple, flat bee: honey body with two soft stripes, a dark head and two
/// pale wings. Facing right.
class _BeePainter extends CustomPainter {
  const _BeePainter();

  static const _ink = Color(0xFF3A2C1C);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 44, size.height / 34);

    final wingFill = Paint()..color = const Color(0xCCFFFFFF);
    final wingEdge = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.2
      ..color = _ink.withValues(alpha: 0.35);
    for (final wing in [
      Rect.fromCenter(center: const Offset(17, 9), width: 13, height: 17),
      Rect.fromCenter(center: const Offset(25, 8), width: 11, height: 15),
    ]) {
      canvas
        ..drawOval(wing, wingFill)
        ..drawOval(wing, wingEdge);
    }

    final body = RRect.fromRectAndRadius(
      const Rect.fromLTWH(6, 14, 28, 17),
      const Radius.circular(8.5),
    );
    canvas
      ..save()
      ..clipRRect(body)
      ..drawRRect(body, Paint()..color = _welcomeHoney);
    final stripe = Paint()..color = _ink.withValues(alpha: 0.85);
    canvas
      ..drawRect(const Rect.fromLTWH(14, 14, 4, 17), stripe)
      ..drawRect(const Rect.fromLTWH(22, 14, 4, 17), stripe)
      ..restore();

    canvas
      ..drawCircle(const Offset(36, 22.5), 6, Paint()..color = _ink)
      ..drawCircle(
        const Offset(38, 21),
        1.4,
        Paint()..color = const Color(0xFFFFFFFF),
      );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_BeePainter oldDelegate) => false;
}
