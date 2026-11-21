import 'package:flutter/material.dart';

// The Hive palette: warm neutral surfaces with a honey accent (tertiary), on
// top of the original desktop design-system text and status roles.
const lightColorScheme = ColorScheme(
  brightness: Brightness.light,
  primary: Color(0xFF262626),
  onPrimary: Color(0xFFFFFFFF),
  primaryContainer: Color(0xFFF2EFEA),
  onPrimaryContainer: Color(0xFF0A0A0A),
  secondary: Color(0xFF646464),
  onSecondary: Color(0xFFFFFFFF),
  secondaryContainer: Color(0xFFF2EFEA),
  onSecondaryContainer: Color(0xFF0A0A0A),
  tertiary: Color(0xFF8F5A00),
  onTertiary: Color(0xFFFFFFFF),
  tertiaryContainer: Color(0xFFFFF3D6),
  onTertiaryContainer: Color(0xFF4A3008),
  error: Color(0xFFCE2C31),
  onError: Color(0xFFFFFFFF),
  errorContainer: Color(0xFFFEEBEC),
  onErrorContainer: Color(0xFF641723),
  surface: Color(0xFFFFFFFF),
  onSurface: Color(0xFF0A0A0A),
  onSurfaceVariant: Color(0xFF646464),
  outline: Color(0xFFE9E5DE),
  outlineVariant: Color(0xFFE9E5DE),
  inverseSurface: Color(0xFF262626),
  onInverseSurface: Color(0xFFFFFFFF),
  inversePrimary: Color(0xFFE5E5E5),
  shadow: Color(0xFF000000),
  scrim: Color(0xFF000000),
  surfaceContainerLowest: Color(0xFFFFFFFF),
  surfaceContainerLow: Color(0xFFF8F6F2),
  surfaceContainer: Color(0xFFF2EFEA),
  surfaceContainerHigh: Color(0xFFE9E5DE),
  surfaceContainerHighest: Color(0xFFF8F6F2),
  surfaceTint: Colors.transparent,
);

const darkColorScheme = ColorScheme(
  brightness: Brightness.dark,
  primary: Color(0xFFFFFFFF),
  onPrimary: Color(0xFF000000),
  primaryContainer: Color(0xFF2A251E),
  onPrimaryContainer: Color(0xFFFFFFFF),
  secondary: Color(0xFFC7C7C7),
  onSecondary: Color(0xFF000000),
  secondaryContainer: Color(0xFF2A251E),
  onSecondaryContainer: Color(0xFFFFFFFF),
  tertiary: Color(0xFFF0B640),
  onTertiary: Color(0xFF000000),
  tertiaryContainer: Color(0xFF33240A),
  onTertiaryContainer: Color(0xFFFFE3A8),
  error: Color(0xFFFF9592),
  onError: Color(0xFF191111),
  errorContainer: Color(0xFF3B1219),
  onErrorContainer: Color(0xFFFFD1D9),
  surface: Color(0xFF000000),
  onSurface: Color(0xFFFFFFFF),
  onSurfaceVariant: Color(0xFFC7C7C7),
  outline: Color(0xFF221E19),
  outlineVariant: Color(0xFF221E19),
  inverseSurface: Color(0xFFC7C7C7),
  onInverseSurface: Color(0xFF000000),
  inversePrimary: Color(0xFF262626),
  shadow: Color(0xFF000000),
  scrim: Color(0xFF000000),
  surfaceContainerLowest: Color(0xFF000000),
  surfaceContainerLow: Color(0xFF12100D),
  surfaceContainer: Color(0xFF1D1A16),
  surfaceContainerHigh: Color(0xFF2A251E),
  surfaceContainerHighest: Color(0xFF2A251E),
  surfaceTint: Colors.transparent,
);

/// Compute a contrast-safe foreground color for a given background.
/// Uses WCAG contrast ratio (higher ratio wins) instead of a simple luminance
/// cutoff, so colors like Blue (#3B82F6) correctly get black text (5.7:1)
/// rather than white (3.7:1).
Color contrastForeground(Color bg) {
  final lum = bg.computeLuminance();
  // WCAG contrast ratio: (L1 + 0.05) / (L2 + 0.05), L1 >= L2
  final contrastWithBlack = (lum + 0.05) / 0.05; // black luminance = 0
  final contrastWithWhite = 1.05 / (lum + 0.05); // white luminance = 1
  return contrastWithBlack >= contrastWithWhite
      ? const Color(0xFF000000)
      : const Color(0xFFFFFFFF);
}
