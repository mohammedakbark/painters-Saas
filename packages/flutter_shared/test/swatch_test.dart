import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('parseHexColour', () {
    test('reads #RRGGBB, RRGGBB and #RGB', () {
      expect(parseHexColour('#E8D5B7'), const Color(0xFFE8D5B7));
      expect(parseHexColour('e8d5b7'), const Color(0xFFE8D5B7));
      expect(parseHexColour('#abc'), const Color(0xFFAABBCC));
    });

    test('anything else is no colour', () {
      expect(parseHexColour(null), isNull);
      expect(parseHexColour(''), isNull);
      expect(parseHexColour('#12345'), isNull);
      expect(parseHexColour('red'), isNull);
    });
  });

  testWidgets('a shade without a colour shows the no-colour mark', (
    tester,
  ) async {
    await tester.pumpWidget(const MaterialApp(home: AppColorSwatch(hex: null)));
    expect(find.byIcon(Icons.format_color_reset_outlined), findsOneWidget);

    await tester.pumpWidget(
      const MaterialApp(home: AppColorSwatch(hex: '#E8D5B7')),
    );
    expect(find.byIcon(Icons.format_color_reset_outlined), findsNothing);
  });
}
