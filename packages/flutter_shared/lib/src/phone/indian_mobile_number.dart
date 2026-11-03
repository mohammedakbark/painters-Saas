/// Indian mobile numbers (initial market: Kerala, D-020).
///
/// Accepts what people type ("98765 43210", "+91 98765-43210",
/// "098765 43210", "919876543210") and returns E.164 (`+91XXXXXXXXXX`).
/// Indian mobile numbers have 10 digits and start with 6, 7, 8 or 9.
/// Mirrors `apps/admin_web/src/lib/phone.ts`.
abstract final class IndianMobileNumber {
  static final RegExp _separators = RegExp(r'[\s\-().]');
  static final RegExp _digits = RegExp(r'^\+?\d+$');
  static final RegExp _national = RegExp(r'^[6-9]\d{9}$');
  static final RegExp _e164 = RegExp(r'^\+91(\d{5})(\d{5})$');

  /// The E.164 form, or null when [input] is not an Indian mobile number.
  static String? parse(String input) {
    final compact = input.replaceAll(_separators, '');
    if (!_digits.hasMatch(compact)) {
      return null;
    }
    var national = compact;
    if (national.startsWith('+91')) {
      national = national.substring(3);
    } else if (national.length == 12 && national.startsWith('91')) {
      national = national.substring(2);
    } else if (national.length == 11 && national.startsWith('0')) {
      national = national.substring(1);
    }
    return _national.hasMatch(national) ? '+91$national' : null;
  }

  /// "+919876543210" → "+91 98765 43210"; other values are returned as is.
  static String format(String e164) {
    final match = _e164.firstMatch(e164);
    return match == null ? e164 : '+91 ${match.group(1)} ${match.group(2)}';
  }
}
