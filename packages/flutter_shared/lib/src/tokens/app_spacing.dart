/// 4 px-based spacing scale from `docs/DESIGN_SYSTEM.md`.
///
/// Use these values instead of one-off spacing literals.
abstract final class AppSpacing {
  static const double s4 = 4;
  static const double s8 = 8;
  static const double s12 = 12;
  static const double s16 = 16;
  static const double s20 = 20;
  static const double s24 = 24;
  static const double s32 = 32;
  static const double s40 = 40;
  static const double s48 = 48;
  static const double s64 = 64;

  /// Standard mobile side padding (20–24 px may be used on larger phones).
  static const double screenPadding = s16;

  /// Minimum touch target for interactive controls, in logical pixels.
  static const double minTouchTarget = s48;
}
