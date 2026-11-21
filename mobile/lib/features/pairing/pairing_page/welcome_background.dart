part of '../pairing_page.dart';

/// Warm cream behind the welcome screen.
const _welcomeCream = Color(0xFFFBF6EC);

/// The Hive's honey, used for the welcome button and decorations.
const _welcomeHoney = Color(0xFFE9A824);

// Welcome-screen background: warm cream, a faint still honeycomb rising from
// the bottom edge, and a single bee drifting gently. Everything here is
// decorative and hidden from assistive technology.
class _WebsiteWelcomeBackground extends StatelessWidget {
  final Widget child;
  final ValueListenable<double> scannerProgress;

  const _WebsiteWelcomeBackground({
    required this.child,
    required this.scannerProgress,
  });

  @override
  Widget build(BuildContext context) {
    final theme = AppTheme.light();
    return DecoratedBox(
      key: const Key('pairing-website-welcome-background'),
      decoration: const BoxDecoration(color: _welcomeCream),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (MediaQuery.textScalerOf(context).scale(16) <= 24)
            Positioned.fill(
              child: IgnorePointer(
                child: ExcludeSemantics(
                  child: ValueListenableBuilder<double>(
                    valueListenable: scannerProgress,
                    builder: (context, progress, child) => Opacity(
                      key: const Key('scanner-cells-opacity'),
                      opacity: 1 - progress,
                      child: Transform.scale(
                        key: const Key('scanner-cells-scale'),
                        scale: MediaQuery.disableAnimationsOf(context)
                            ? 1
                            : 1 - 0.04 * progress,
                        child: TickerMode(enabled: progress < 1, child: child!),
                      ),
                    ),
                    child: const Stack(
                      fit: StackFit.expand,
                      children: [
                        RepaintBoundary(
                          child: CustomPaint(
                            key: Key('welcome-honeycomb'),
                            painter: _HoneycombLatticePainter(),
                          ),
                        ),
                        _WelcomeBee(),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          Theme(
            data: theme.copyWith(
              textButtonTheme: TextButtonThemeData(
                style: theme.textButtonTheme.style?.copyWith(
                  backgroundColor: const WidgetStatePropertyAll(_welcomeHoney),
                ),
              ),
            ),
            child: child,
          ),
        ],
      ),
    );
  }
}

/// Thin honeycomb outlines across the lower part of the screen, fading out
/// toward the middle so the content above stays clean.
class _HoneycombLatticePainter extends CustomPainter {
  const _HoneycombLatticePainter();

  static const _radius = 26.0;

  @override
  void paint(Canvas canvas, Size size) {
    if (size.isEmpty) return;
    final top = size.height * 0.55;
    final band = Rect.fromLTRB(0, top, size.width, size.height);
    canvas.saveLayer(band, Paint());
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = _welcomeHoney.withValues(alpha: 0.24);
    final width = math.sqrt(3) * _radius;
    final rowStep = _radius * 1.5;
    var row = 0;
    for (var y = size.height; y > top - _radius; y -= rowStep, row++) {
      final shift = row.isOdd ? width / 2 : 0.0;
      for (var x = -width + shift; x < size.width + width; x += width) {
        canvas.drawPath(_latticeCell(Offset(x, y)), stroke);
      }
    }
    // Fade the lattice out toward the top of its band.
    canvas.drawRect(
      band,
      Paint()
        ..blendMode = BlendMode.dstIn
        ..shader = const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0x00000000), Color(0xFF000000)],
        ).createShader(band),
    );
    canvas.restore();
  }

  Path _latticeCell(Offset center) {
    final path = Path();
    for (var i = 0; i < 6; i++) {
      final angle = (math.pi / 3) * i - math.pi / 2;
      final point = center + Offset(math.cos(angle), math.sin(angle)) * _radius;
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    return path..close();
  }

  @override
  bool shouldRepaint(_HoneycombLatticePainter oldDelegate) => false;
}
