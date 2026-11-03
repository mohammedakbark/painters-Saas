import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('IndianMobileNumber.parse', () {
    const accepted = {
      '9876543210': '+919876543210',
      '98765 43210': '+919876543210',
      '+91 98765-43210': '+919876543210',
      '+919876543210': '+919876543210',
      '919876543210': '+919876543210',
      '098765 43210': '+919876543210',
      '(+91) 6123 456 789': '+916123456789',
    };
    for (final MapEntry(key: input, value: expected) in accepted.entries) {
      test('accepts "$input"', () {
        expect(IndianMobileNumber.parse(input), expected);
      });
    }

    const rejected = [
      '',
      '98765',
      '987654321012',
      '5876543210',
      '+14155550100',
      '98765abcde',
      '98765+43210',
    ];
    for (final input in rejected) {
      test('rejects "$input"', () {
        expect(IndianMobileNumber.parse(input), isNull);
      });
    }
  });

  group('IndianMobileNumber.format', () {
    test('groups an Indian number for display', () {
      expect(IndianMobileNumber.format('+919999900001'), '+91 99999 00001');
    });

    test('returns other values unchanged', () {
      expect(IndianMobileNumber.format('+14155550100'), '+14155550100');
    });
  });
}
