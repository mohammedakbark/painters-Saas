import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('formatCoordinates uses six decimals', () {
    expect(formatCoordinates(9.9658123, 76.2898765), '9.965812, 76.289877');
  });

  testWidgets(
    'with maps turned off it shows the coordinates, not a blank map',
    (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          theme: AppTheme.light(),
          home: const Scaffold(
            body: ShopLocationMap(
              latitude: 10.0261,
              longitude: 76.3125,
              mapsEnabled: false,
            ),
          ),
        ),
      );

      expect(find.text('Map not available in this build'), findsOneWidget);
      expect(find.text('Pin: 10.026100, 76.312500'), findsOneWidget);
    },
  );

  testWidgets('draws an OpenStreetMap map with the pin and the attribution', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(
          body: ShopLocationMap(
            latitude: 10.0261,
            longitude: 76.3125,
            shopName: 'Lakshmi Paints',
          ),
        ),
      ),
    );

    expect(find.byType(FlutterMap), findsOneWidget);
    expect(find.text('OpenStreetMap contributors'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Map showing Lakshmi Paints, 10.026100, 76.312500'),
      findsOneWidget,
    );
    expect(find.text('Map not available in this build'), findsNothing);
  });
}
