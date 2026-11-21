part of '../pairing_page.dart';

class _OnboardingBackground extends StatelessWidget {
  final Widget child;
  final bool websiteWelcome;
  final ValueListenable<double> scannerProgress;

  const _OnboardingBackground({
    required this.child,
    this.websiteWelcome = false,
    this.scannerProgress = const AlwaysStoppedAnimation(0),
  });

  @override
  Widget build(BuildContext context) {
    if (websiteWelcome) {
      return _WebsiteWelcomeBackground(
        scannerProgress: scannerProgress,
        child: child,
      );
    }
    final isDark = context._onboardingIsDark;
    // The same calm look as the welcome screen: cream with a faint still
    // honeycomb in light mode, warm charcoal with soft honey glows in dark.
    return DecoratedBox(
      key: const Key('pairing-onboarding-background'),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF16130F) : _welcomeCream,
      ),
      child: CustomPaint(
        painter: isDark
            ? const _OnboardingShellPainter(isDark: true)
            : const _HoneycombLatticePainter(),
        child: child,
      ),
    );
  }
}

class _OnboardingShellPainter extends CustomPainter {
  final bool isDark;

  const _OnboardingShellPainter({required this.isDark});

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    if (isDark) {
      // Two soft honey glows in opposite corners.
      _paintGlow(
        canvas,
        size,
        const Offset(0.9, 1),
        0.7,
        const Color(0xFF3A2A12),
      );
      _paintGlow(
        canvas,
        size,
        const Offset(0.15, 0),
        0.65,
        const Color(0xFF2B2318),
      );
    }
  }

  void _paintGlow(
    Canvas canvas,
    Size size,
    Offset position,
    double stop,
    Color color,
  ) {
    final radiusX =
        (position.dx > 0.5 ? position.dx : 1 - position.dx) *
        size.width *
        sqrt2 *
        stop;
    final radiusY =
        (position.dy > 0.5 ? position.dy : 1 - position.dy) *
        size.height *
        sqrt2 *
        stop;
    canvas.save();
    canvas.clipRect(Offset.zero & size);
    canvas.translate(position.dx * size.width, position.dy * size.height);
    canvas.scale(radiusX, radiusY);
    canvas.drawCircle(
      Offset.zero,
      1,
      Paint()
        ..shader = RadialGradient(
          colors: [color, color.withValues(alpha: 0)],
        ).createShader(const Rect.fromLTWH(-1, -1, 2, 2)),
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(_OnboardingShellPainter oldDelegate) =>
      oldDelegate.isDark != isDark;
}
