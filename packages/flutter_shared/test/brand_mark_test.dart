import 'package:flutter/material.dart';
import 'package:flutter_shared/flutter_shared.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('BrandMark shows the fan and SevenPalette with the app '
      'word, and the app name for screen readers', (tester) async {
    final semantics = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(body: BrandMark(appName: AppBrand.shopAppName)),
      ),
    );

    expect(find.byType(LogoMark), findsOneWidget);
    expect(find.text('Shop'), findsOneWidget);
    expect(find.bySemanticsLabel(AppBrand.shopAppName), findsOneWidget);
    semantics.dispose();
  });

  testWidgets('BrandMark adds no word for the Customer App', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.light(),
        home: const Scaffold(
          body: BrandMark(appName: AppBrand.customerAppName),
        ),
      ),
    );

    expect(find.byType(LogoMark), findsOneWidget);
    expect(find.text('Shop'), findsNothing);
  });

  test('layout tokens match the web container scale', () {
    // 28rem on the web (max-w-form); generated from tokens.json.
    expect(AppLayout.formMaxWidth, 448);
    expect(AppLayout.mediumBreakpoint, 600);
    expect(AppLayout.desktopBreakpoint, 900);
  });
}
