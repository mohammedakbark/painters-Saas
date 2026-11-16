import 'package:flutter/material.dart';

import '../tokens/app_colors.dart';
import '../tokens/app_component_tokens.dart';

/// `#RGB`, `RRGGBB` or `#RRGGBB` → the colour; null for anything else.
Color? parseHexColour(String? value) {
  if (value == null) return null;
  var hex = value.trim().replaceFirst('#', '');
  if (RegExp(r'^[0-9a-fA-F]{3}$').hasMatch(hex)) {
    hex = hex.split('').map((digit) => '$digit$digit').join();
  }
  if (!RegExp(r'^[0-9a-fA-F]{6}$').hasMatch(hex)) return null;
  return Color(int.parse('FF$hex', radix: 16));
}

/// A shade's indicative screen colour (SHP-014). Without a colour it shows
/// an empty box with a slash, so "no colour" never looks like white. The
/// colour on a screen is only a guide, never the real paint.
class AppColorSwatch extends StatelessWidget {
  const AppColorSwatch({super.key, required this.hex, this.size = 40});

  /// For example `#E8D5B7`; null or invalid when the shade has none.
  final String? hex;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colour = parseHexColour(hex);
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: colour ?? AppComponentTokens.swatchBackground,
          borderRadius: BorderRadius.circular(AppComponentTokens.swatchRadius),
          border: Border.all(color: AppComponentTokens.swatchBorder),
        ),
        child: colour == null
            ? Icon(
                Icons.format_color_reset_outlined,
                size: size * 0.5,
                color: AppColors.textSecondary,
              )
            : null,
      ),
    );
  }
}
