import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import 'app_brand.dart';

/// The product mark shown at the top of entry screens (DS-001, DS-003): the
/// SevenPalette shade-card fan and wordmark, with the app's own word after
/// it ("Shop" for the Shop App). Every screen that shows the brand uses it.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, required this.appName});

  /// For example [AppBrand.shopAppName].
  final String appName;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final suffix = appName.startsWith(AppBrand.productName)
        ? appName.substring(AppBrand.productName.length).trim()
        : appName;
    final wordStyle = textTheme.titleLarge?.copyWith(
      fontWeight: FontWeight.w700,
      color: AppColors.textPrimary,
    );
    return Semantics(
      label: appName,
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const LogoMark(height: 32),
          const SizedBox(width: 10),
          Text.rich(
            TextSpan(
              style: wordStyle,
              children: [
                const TextSpan(text: 'Seven'),
                TextSpan(
                  text: 'Palette',
                  style: wordStyle?.copyWith(color: AppColors.brandPrimary),
                ),
              ],
            ),
          ),
          if (suffix.isNotEmpty) ...[
            const SizedBox(width: 6),
            Text(
              suffix,
              style: textTheme.titleMedium?.copyWith(
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// The shade-card fan on its own (decorative). Same geometry as the master
/// SVGs in packages/design_tokens/logo: seven 12 × 62 strips, 24° apart.
class LogoMark extends StatelessWidget {
  const LogoMark({super.key, this.height = 32});

  final double height;

  /// Drawing box of the fan in logo units (see build-logo.mjs).
  static const double _width = 148.46;
  static const double _height = 85;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: height,
      width: height * _width / _height,
      child: const CustomPaint(painter: _FanPainter()),
    );
  }
}

class _FanPainter extends CustomPainter {
  const _FanPainter();

  static const List<Color> _strips = [
    AppColors.brandPrimaryStrong,
    AppColors.brandPrimary,
    AppColors.logoTealMid,
    AppColors.logoTealLight,
    AppColors.brandAccent,
    AppColors.logoOrange,
    AppColors.brandHighlight,
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final scale = size.width / LogoMark._width;
    canvas
      ..scale(scale)
      // viewBox origin (-24.23, 8), then the pivot at (50, 84).
      ..translate(24.23 + 50, -8 + 84);
    for (var i = 0; i < _strips.length; i++) {
      canvas
        ..save()
        ..rotate((-72 + i * 24) * math.pi / 180)
        ..drawRRect(
          RRect.fromRectAndRadius(
            const Rect.fromLTWH(-6, -74, 12, 62),
            const Radius.circular(4),
          ),
          Paint()..color = _strips[i],
        )
        ..restore();
    }
    canvas.drawCircle(
      Offset.zero,
      7,
      Paint()..color = AppColors.brandPrimaryStrong,
    );
  }

  @override
  bool shouldRepaint(covariant _FanPainter oldDelegate) => false;
}
