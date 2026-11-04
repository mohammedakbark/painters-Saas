// Money is integer paise in the API (CAT-002); people type and read rupees.
// Same rules and messages as the web portal (`apps/admin_web/src/lib/money.ts`).

/// ₹1 crore in paise: the API's upper limit for a price.
const int maxPaise = 1000000000;

String _groupIndian(int rupees) {
  final digits = rupees.toString();
  if (digits.length <= 3) return digits;
  final last3 = digits.substring(digits.length - 3);
  var rest = digits.substring(0, digits.length - 3);
  final groups = <String>[];
  while (rest.length > 2) {
    groups.insert(0, rest.substring(rest.length - 2));
    rest = rest.substring(0, rest.length - 2);
  }
  if (rest.isNotEmpty) groups.insert(0, rest);
  return '${groups.join(',')},$last3';
}

/// 145000 → "₹1,450"; 145050 → "₹1,450.5"; 12345678 → "₹1,23,456.78".
String formatRupees(int paise) {
  final sign = paise < 0 ? '-' : '';
  final value = paise.abs();
  final rest = value % 100;
  var fraction = '';
  if (rest != 0) {
    fraction = '.${rest.toString().padLeft(2, '0')}';
    if (fraction.endsWith('0')) {
      fraction = fraction.substring(0, fraction.length - 1);
    }
  }
  return '$sign₹${_groupIndian(value ~/ 100)}$fraction';
}

/// 145000 → "1450"; 145005 → "1450.05"; null → "" (for a form field).
String paiseToInput(int? paise) {
  if (paise == null) return '';
  final rupees = paise ~/ 100;
  final rest = paise % 100;
  return rest == 0 ? '$rupees' : '$rupees.${rest.toString().padLeft(2, '0')}';
}

/// The result of reading a typed rupee amount.
sealed class RupeeParse {
  const RupeeParse();
}

final class RupeesParsed extends RupeeParse {
  const RupeesParsed(this.paise);

  final int paise;
}

final class RupeesInvalid extends RupeeParse {
  const RupeesInvalid(this.message);

  final String message;
}

final _amount = RegExp(r'^(\d{1,8})(?:\.(\d{1,2}))?$');

/// "1,450", "₹ 1450.5", "Rs. 1450.50" → paise. At most two decimals, more
/// than ₹0 and up to ₹1 crore. Read from the text, never through floating
/// point.
RupeeParse parseRupees(String text, {String label = 'price'}) {
  final cleaned = text
      .replaceAll(RegExp(r'[₹,\s]'), '')
      .replaceFirst(RegExp(r'^rs\.?', caseSensitive: false), '');
  final match = _amount.firstMatch(cleaned);
  if (match == null) {
    return RupeesInvalid(
      'Enter the $label in rupees, for example 1450 or 1450.50.',
    );
  }
  final paise =
      int.parse(match.group(1)!) * 100 +
      int.parse((match.group(2) ?? '').padRight(2, '0'));
  if (paise < 1) {
    return RupeesInvalid('The $label must be more than ₹0.');
  }
  if (paise > maxPaise) {
    return RupeesInvalid('The $label is too large.');
  }
  return RupeesParsed(paise);
}
