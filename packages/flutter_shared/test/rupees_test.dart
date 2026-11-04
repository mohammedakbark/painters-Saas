import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

// The same cases as the web portal (apps/admin_web/src/lib/money.test.ts).

int? _paise(String text, {String label = 'price'}) =>
    switch (parseRupees(text, label: label)) {
      RupeesParsed(:final paise) => paise,
      RupeesInvalid() => null,
    };

String? _message(String text, {String label = 'price'}) =>
    switch (parseRupees(text, label: label)) {
      RupeesParsed() => null,
      RupeesInvalid(:final message) => message,
    };

void main() {
  test('reads rupees and paise without floating point', () {
    expect(_paise('1450'), 145000);
    expect(_paise(' ₹ 1,450.5 '), 145050);
    expect(_paise('Rs. 0.07'), 7);
    expect(_paise('19.99'), 1999);
  });

  test('refuses unreadable, zero and too large amounts', () {
    expect(
      _message('12.345', label: 'MRP'),
      'Enter the MRP in rupees, for example 1450 or 1450.50.',
    );
    expect(_paise('-5'), isNull);
    expect(_message('0'), 'The price must be more than ₹0.');
    expect(_message('10000000.01'), 'The price is too large.');
    expect(_paise('10000000'), maxPaise);
  });

  test('formats paise for display and for form fields', () {
    expect(formatRupees(145000), '₹1,450');
    expect(formatRupees(145050), '₹1,450.5');
    expect(formatRupees(12345678), '₹1,23,456.78');
    expect(formatRupees(99), '₹0.99');
    expect(formatRupees(maxPaise), '₹1,00,00,000');
    expect(paiseToInput(145000), '1450');
    expect(paiseToInput(145005), '1450.05');
    expect(paiseToInput(null), '');
  });
}
